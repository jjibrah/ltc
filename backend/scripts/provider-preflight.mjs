import { createClient } from '@supabase/supabase-js';
const ref=process.env.TEST_SUPABASE_PROJECT_REF;
if(ref!=='vgqvaluplhbgyrvzvgue'||new URL(process.env.SUPABASE_URL).hostname!==`${ref}.supabase.co`)throw new Error('Unconfirmed TEST project');
const p=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const r=await p.from('application_users').select('id',{head:true,count:'exact'}).limit(1);
console.log(JSON.stringify({target:'TEST',project:ref,serviceRoleAccess:!r.error,errorCode:r.error?.code||null}));if(r.error)process.exit(1);
