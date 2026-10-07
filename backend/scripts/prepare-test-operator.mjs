// Explicit TEST-only fixture setup; never imported by runtime, tests, CI or workers.
import { createClient } from '@supabase/supabase-js';import { randomBytes } from 'node:crypto';import { appendFileSync } from 'node:fs';
const ref=process.env.TEST_SUPABASE_PROJECT_REF;
if(ref!=='vgqvaluplhbgyrvzvgue'||new URL(process.env.SUPABASE_URL).hostname!==`${ref}.supabase.co`)throw new Error('Unconfirmed TEST project');
const p=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
if(process.env.TEST_OPERATOR_EMAIL&&process.env.TEST_OPERATOR_PASSWORD){console.log('TEST operator already configured locally; unchanged.');process.exit(0);}
const email=`ltc-test-operator-${randomBytes(4).toString('hex')}@example.invalid`;const password=`Test9-${randomBytes(24).toString('base64url')}`;
const auth=await p.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'TEST operator'}});if(auth.error||!auth.data.user)throw new Error('TEST Auth fixture creation failed');
const user=await p.from('application_users').insert({auth_user_id:auth.data.user.id,email,name:'TEST operator',role:'super_admin',status:'active'}).select('id').single();if(user.error){await p.auth.admin.deleteUser(auth.data.user.id);throw new Error('TEST application operator fixture failed');}
appendFileSync('.env',`\n# Synthetic TEST operator; no mail sent. Credentials remain local.\nTEST_OPERATOR_EMAIL=${email}\nTEST_OPERATOR_PASSWORD=${password}\nTEST_OPERATOR_ID=${user.data.id}\n`);
console.log('Created synthetic TEST operator in vgqvaluplhbgyrvzvgue. Credentials are saved only in ignored backend/.env. No email sent.');
