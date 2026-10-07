import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const entries=[];
for(const base of ['src/site','src/shared/styles','public']){
 function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else entries.push({path:p,bytes:readFileSync(p).length,sha256:createHash('sha256').update(readFileSync(p)).digest('hex')});}}walk(base);
}
writeFileSync('docs/preservation-baseline.json',JSON.stringify({commit:'5ea76744eb01540450297018a10acdba82571cab',kind:'source hashes; not visual verification',entries},null,2)+'\n');
console.log(`Captured ${entries.length} unchanged public source/style/asset files`);
