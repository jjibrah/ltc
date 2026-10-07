// Manual, one-packet execution only. Not imported by runtime/tests/CI/infra.
import { readFileSync } from 'node:fs';import { createHash } from 'node:crypto';import { spawnSync } from 'node:child_process';
const packets={
 '70f29fa1532142eff94796a58bdf24635caa61d36e6df978d8232c9681f659cd':'fresh-test-bootstrap.sql',
 '55c1662ffc552323a5114763deb718409a5960185f1e5d2946ae87bc0edb8ab3':'20261007_061_storage_cleanup.sql',
};
const expected=process.argv[2]?.replace(/^--execute-approved-/,'');
if(!packets[expected]||process.argv[2]!==`--execute-approved-${expected}`)throw new Error('No approved exact checksum supplied; refusing execution');
const sql=readFileSync(`migrations/${packets[expected]}`);if(createHash('sha256').update(sql).digest('hex')!==expected)throw new Error('Approved SQL checksum changed; renewed approval required');
const db=new URL(process.env.SUPABASE_DATABASE_URL||'');const api=new URL(process.env.SUPABASE_URL||'');
if(decodeURIComponent(db.username)!=='postgres.vgqvaluplhbgyrvzvgue'||api.hostname!=='vgqvaluplhbgyrvzvgue.supabase.co'||db.hostname!=='aws-0-us-east-1.pooler.supabase.com'||db.pathname!=='/postgres'||process.env.APP_ENV!=='test')throw new Error('Approved TEST target mismatch; refusing execution');
console.log(`Executing explicitly approved TEST packet ${expected} on vgqvaluplhbgyrvzvgue / postgres`);
const result=spawnSync('psql',['--no-psqlrc','--set','ON_ERROR_STOP=1'],{input:sql,env:{...process.env,PGHOST:db.hostname,PGPORT:db.port||'5432',PGUSER:decodeURIComponent(db.username),PGPASSWORD:decodeURIComponent(db.password),PGDATABASE:'postgres',PGSSLMODE:'require',PGCONNECT_TIMEOUT:'10'},encoding:'utf8'});
console.log(result.stdout);
if(result.status!==0){console.error(result.stderr.replace(/postgres(?:ql)?:\/\/\S+/g,'[REDACTED]'));process.exit(1);}
