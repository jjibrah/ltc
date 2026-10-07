import { spawnSync } from 'node:child_process';
const ref=process.env.TEST_SUPABASE_PROJECT_REF;
if(!ref)throw new Error('Set TEST_SUPABASE_PROJECT_REF to the owner-confirmed TEST project identifier');
const db=new URL(process.env.SUPABASE_DATABASE_URL||'');const api=new URL(process.env.SUPABASE_URL||'');
if(decodeURIComponent(db.username)!==`postgres.${ref}`||api.hostname!==`${ref}.supabase.co`)throw new Error('TEST database/API project mismatch; refusing connection');
const query=`SELECT json_build_object('application_users',to_regclass('public.application_users'),'donation_sessions',to_regclass('public.donation_sessions'),'newsletters',to_regclass('public.newsletters'),'auth_users',to_regclass('auth.users'),'storage_buckets',to_regclass('storage.buckets'));`;
const child=spawnSync('psql',['--no-psqlrc','--tuples-only','--no-align','--set','ON_ERROR_STOP=1','--command',query],{env:{...process.env,PGHOST:db.hostname,PGPORT:db.port||'5432',PGUSER:decodeURIComponent(db.username),PGPASSWORD:decodeURIComponent(db.password),PGDATABASE:db.pathname.slice(1),PGSSLMODE:'require',PGCONNECT_TIMEOUT:'10'},encoding:'utf8'});
console.log(`Read-only TEST schema check: ${ref} / ${db.hostname} / ${db.pathname.slice(1)}`);
if(child.status!==0){console.error('Read-only connection failed; credentials and provider diagnostics withheld.');process.exit(1);}console.log(child.stdout.trim());
