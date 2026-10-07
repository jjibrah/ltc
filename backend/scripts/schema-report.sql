-- READ ONLY: catalogue inspection. No application rows or password/key values.
-- Run in the intended Supabase project's SQL editor and export the JSON result.
-- Routine/view/trigger definitions can contain hardcoded secrets: review before sharing.
-- Extension-owned routine definitions are omitted; their identity and extension remain listed.
WITH
namespaces AS (
 SELECT oid, nspname, nspowner, nspacl
 FROM pg_namespace
 WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
),
relations AS (
 SELECT c.*, n.nspname
 FROM pg_class c JOIN namespaces n ON n.oid = c.relnamespace
 WHERE c.relkind IN ('r','p','v','m','f','S')
),
routines AS (
 SELECT p.*, n.nspname, l.lanname,
   (SELECT e.extname FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
    WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
      AND d.refclassid='pg_extension'::regclass AND d.deptype='e' LIMIT 1) AS extension_name
 FROM pg_proc p JOIN namespaces n ON n.oid=p.pronamespace
 JOIN pg_language l ON l.oid=p.prolang
),
sections AS (
 SELECT 'database' AS section, jsonb_build_object(
   'database', current_database(), 'server_version', current_setting('server_version'),
   'report_role', current_user, 'captured_at', statement_timestamp(),
   'search_path', current_setting('search_path'),
   'scope', 'All non-system schemas; metadata only; no application records',
   'limitations', 'Not a backup. Does not include object bytes, Auth provider settings, secrets, application rows, cron command text or extension-owned routine bodies.'
 ) AS body
 UNION ALL
 SELECT 'schemas', COALESCE(jsonb_agg(jsonb_build_object(
   'name', nspname, 'owner', pg_get_userbyid(nspowner),
   'effective_acl', COALESCE(nspacl,acldefault('n',nspowner))::text
 ) ORDER BY nspname),'[]'::jsonb) FROM namespaces
 UNION ALL
 SELECT 'tables_and_views', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', nspname, 'name', relname, 'kind', relkind,
   'owner', pg_get_userbyid(relowner), 'rls_enabled', relrowsecurity,
   'rls_forced', relforcerowsecurity, 'persistence', relpersistence,
   'is_partition', relispartition,
   'partition_bound', pg_get_expr(relpartbound,oid),
   'partition_key', CASE WHEN relkind='p' THEN pg_get_partkeydef(oid) END,
   'estimated_rows', reltuples, 'options', reloptions,
   'effective_acl', COALESCE(relacl,acldefault(CASE WHEN relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,relowner))::text,
   'comment', obj_description(oid,'pg_class'),
   'view_definition', CASE WHEN relkind IN ('v','m') THEN pg_get_viewdef(oid,true) END
 ) ORDER BY nspname,relname),'[]'::jsonb) FROM relations
 UNION ALL
 SELECT 'columns', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', r.nspname, 'table', r.relname, 'position', a.attnum,
   'name', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
   'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin,d.adrelid),
   'identity', a.attidentity, 'generated', a.attgenerated,
   'collation', CASE WHEN a.attcollation<>0 THEN a.attcollation::regcollation::text END,
   'explicit_acl', a.attacl::text, 'comment', col_description(r.oid,a.attnum)
 ) ORDER BY r.nspname,r.relname,a.attnum),'[]'::jsonb)
 FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid
 LEFT JOIN pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
 WHERE a.attnum>0 AND NOT a.attisdropped AND r.relkind<>'S'
 UNION ALL
 SELECT 'constraints', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', n.nspname, 'name', c.conname, 'type', c.contype,
   'table', CASE WHEN c.conrelid<>0 THEN c.conrelid::regclass::text END,
   'domain', CASE WHEN c.contypid<>0 THEN c.contypid::regtype::text END,
   'references', CASE WHEN c.confrelid<>0 THEN c.confrelid::regclass::text END,
   'definition', pg_get_constraintdef(c.oid,true),
   'validated', c.convalidated, 'deferrable', c.condeferrable,
   'initially_deferred', c.condeferred
 ) ORDER BY n.nspname,c.conname),'[]'::jsonb)
 FROM pg_constraint c JOIN namespaces n ON n.oid=c.connamespace
 UNION ALL
 SELECT 'indexes', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', r.nspname, 'table', r.relname, 'name', i.indexrelid::regclass::text,
   'definition', pg_get_indexdef(i.indexrelid), 'unique', i.indisunique,
   'primary', i.indisprimary, 'valid', i.indisvalid, 'ready', i.indisready,
   'predicate', pg_get_expr(i.indpred,i.indrelid)
 ) ORDER BY r.nspname,r.relname,i.indexrelid::regclass::text),'[]'::jsonb)
 FROM pg_index i JOIN relations r ON r.oid=i.indrelid
 UNION ALL
 SELECT 'triggers', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', r.nspname, 'table', r.relname, 'name', t.tgname,
   'enabled', t.tgenabled, 'internal', t.tgisinternal,
   'function', t.tgfoid::regprocedure::text,
   'definition', pg_get_triggerdef(t.oid,true)
 ) ORDER BY r.nspname,r.relname,t.tgname),'[]'::jsonb)
 FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid
 UNION ALL
 SELECT 'rls_policies', COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.schemaname,p.tablename,p.policyname),'[]'::jsonb)
 FROM pg_policies p JOIN namespaces n ON n.nspname=p.schemaname
 UNION ALL
 SELECT 'rules', COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.schemaname,r.tablename,r.rulename),'[]'::jsonb)
 FROM pg_rules r JOIN namespaces n ON n.nspname=r.schemaname
 UNION ALL
 SELECT 'functions_and_procedures', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', nspname, 'name', proname,
   'identity_arguments', pg_get_function_identity_arguments(oid),
   'arguments', pg_get_function_arguments(oid),
   'returns', CASE WHEN prokind<>'p' THEN pg_get_function_result(oid) END,
   'kind', prokind, 'language', lanname, 'owner', pg_get_userbyid(proowner),
   'security_definer', prosecdef, 'volatility', provolatile,
   'strict', proisstrict, 'parallel', proparallel,
   'settings', proconfig, 'effective_acl', COALESCE(proacl,acldefault('f',proowner))::text,
   'extension', extension_name,
   'definition', CASE WHEN prokind IN ('f','p') AND extension_name IS NULL THEN pg_get_functiondef(oid) END
 ) ORDER BY nspname,proname,pg_get_function_identity_arguments(oid)),'[]'::jsonb) FROM routines
 UNION ALL
 SELECT 'routine_execute_grants', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', p.nspname, 'name', p.proname,
   'identity_arguments', pg_get_function_identity_arguments(p.oid),
   'grantee', CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
   'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type,
   'grantable', a.is_grantable
 ) ORDER BY p.nspname,p.proname,a.grantee),'[]'::jsonb)
 FROM routines p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
 UNION ALL
 SELECT 'relation_grants', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', r.nspname, 'relation', r.relname,
   'grantee', CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
   'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type,
   'grantable', a.is_grantable
 ) ORDER BY r.nspname,r.relname,a.grantee,a.privilege_type),'[]'::jsonb)
 FROM relations r CROSS JOIN LATERAL aclexplode(COALESCE(r.relacl,acldefault(CASE WHEN r.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,r.relowner))) a
 UNION ALL
 SELECT 'default_grants', COALESCE(jsonb_agg(jsonb_build_object(
   'owner', pg_get_userbyid(d.defaclrole), 'schema', n.nspname,
   'object_type', d.defaclobjtype, 'acl', d.defaclacl::text
 ) ORDER BY d.defaclrole,n.nspname,d.defaclobjtype),'[]'::jsonb)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
 UNION ALL
 SELECT 'types', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', n.nspname, 'name', t.typname, 'kind', t.typtype,
   'owner', pg_get_userbyid(t.typowner), 'not_null', t.typnotnull,
   'domain_base', CASE WHEN t.typtype='d' THEN format_type(t.typbasetype,t.typtypmod) END,
   'domain_default', t.typdefault,
   'enum_values', (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid),
   'composite_attributes', (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod)) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=t.typrelid AND a.attnum>0 AND NOT a.attisdropped)
 ) ORDER BY n.nspname,t.typname),'[]'::jsonb)
 FROM pg_type t JOIN namespaces n ON n.oid=t.typnamespace
 WHERE t.typtype IN ('e','d') OR (t.typtype='c' AND EXISTS (SELECT 1 FROM pg_class c WHERE c.oid=t.typrelid AND c.relkind='c'))
 UNION ALL
 SELECT 'sequences', COALESCE(jsonb_agg(jsonb_build_object(
   'schema', r.nspname, 'name', r.relname,
   'type', format_type(s.seqtypid,NULL), 'start', s.seqstart,
   'increment', s.seqincrement, 'min', s.seqmin, 'max', s.seqmax,
   'cache', s.seqcache, 'cycle', s.seqcycle
 ) ORDER BY r.nspname,r.relname),'[]'::jsonb)
 FROM pg_sequence s JOIN relations r ON r.oid=s.seqrelid
 UNION ALL
 SELECT 'inheritance', COALESCE(jsonb_agg(jsonb_build_object(
   'child', i.inhrelid::regclass::text, 'parent', i.inhparent::regclass::text
 ) ORDER BY i.inhrelid,i.inhseqno),'[]'::jsonb)
 FROM pg_inherits i JOIN relations r ON r.oid=i.inhrelid
 UNION ALL
 SELECT 'extensions', COALESCE(jsonb_agg(jsonb_build_object(
   'name', e.extname, 'version', e.extversion, 'schema', n.nspname
 ) ORDER BY e.extname),'[]'::jsonb)
 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
 UNION ALL
 SELECT 'roles', COALESCE(jsonb_agg(jsonb_build_object(
   'name', rolname, 'superuser', rolsuper, 'inherit', rolinherit,
   'create_role', rolcreaterole, 'create_db', rolcreatedb,
   'can_login', rolcanlogin, 'replication', rolreplication, 'bypass_rls', rolbypassrls
 ) ORDER BY rolname),'[]'::jsonb) FROM pg_roles
 UNION ALL
 SELECT 'role_memberships', COALESCE(jsonb_agg(jsonb_build_object(
   'role', pg_get_userbyid(roleid), 'member', pg_get_userbyid(member),
   'grantor', pg_get_userbyid(grantor), 'admin_option', admin_option
 ) ORDER BY roleid,member),'[]'::jsonb) FROM pg_auth_members
 UNION ALL
 SELECT 'publications', COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.pubname),'[]'::jsonb) FROM pg_publication p
 UNION ALL
 SELECT 'publication_tables', COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.pubname,p.schemaname,p.tablename),'[]'::jsonb) FROM pg_publication_tables p
 UNION ALL
 SELECT 'storage_bucket_configuration', COALESCE(jsonb_agg(jsonb_build_object(
   'id', b.id, 'name', b.name, 'public', b.public,
   'file_size_limit', to_jsonb(b)->'file_size_limit',
   'allowed_mime_types', to_jsonb(b)->'allowed_mime_types'
 ) ORDER BY b.id),'[]'::jsonb) FROM storage.buckets b
 UNION ALL
 SELECT 'object_dependencies', COALESCE(jsonb_agg(jsonb_build_object(
   'object', pg_describe_object(d.classid,d.objid,d.objsubid),
   'depends_on', pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid),
   'dependency_type', d.deptype
 ) ORDER BY d.classid,d.objid,d.objsubid),'[]'::jsonb)
 FROM pg_depend d WHERE
   (d.classid='pg_class'::regclass AND d.objid IN (SELECT oid FROM relations)) OR
   (d.classid='pg_proc'::regclass AND d.objid IN (SELECT oid FROM routines))
)
SELECT jsonb_object_agg(section,body ORDER BY section) AS schema_report FROM sections;
