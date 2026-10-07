import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const files = [];
function walk(dir) { for (const e of readdirSync(dir, {withFileTypes:true})) {const p=join(dir,e.name); if(e.isDirectory())walk(p);else if(p.endsWith('.py'))files.push(p);} }
const legacyRoot = process.env.LTC_LEGACY_BACKEND_DIR || '../../LTC-backend';
if (!existsSync(join(legacyRoot, 'app'))) throw new Error('Legacy reference is outside the deployable repository. Set LTC_LEGACY_BACKEND_DIR to its local directory before regenerating the inventory. Tests use the retained docs/legacy-contracts.json snapshot.');
walk(join(legacyRoot, 'app'));
const inventory=[];
const {endpoints}=await import('../../frontend/src/shared/api/endpoints.js');
const frontendFiles=[];
function frontendWalk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())frontendWalk(path);else if(/\.(?:js|jsx)$/.test(path))frontendFiles.push({path:path.replace('../',''),source:readFileSync(path,'utf8')});}}
frontendWalk('../frontend/src');
const endpointLeaves=[];
function flatten(value,key=''){for(const [name,entry]of Object.entries(value)){const selector=key?`${key}.${name}`:name;if(typeof entry==='object')flatten(entry,selector);else {const path=typeof entry==='function'?entry(...Array.from({length:entry.length},(_,index)=>`__param${index}__`)):entry;endpointLeaves.push({selector,path});}}}
flatten(endpoints);
function callers(path){return endpointLeaves.filter(leaf=>{const pattern=leaf.path.split('?')[0].replace(/\/$/,'').split('/').map(part=>/^__param\d+__$/.test(part)?'[^/]+':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/');return new RegExp(`^${pattern}$`).test(path.replace(/\/$/,''));}).map(leaf=>({selector:`endpoints.${leaf.selector}`,files:frontendFiles.filter(file=>file.source.includes(`endpoints.${leaf.selector}`)).map(file=>file.path)}));}
function models(file,contract){const names=[...contract.matchAll(/\b(?:payload|body)\s*:\s*(\w+)/g)].map(m=>m[1]);const sources=[file,join(dirname(file),'schemas.py'),join(dirname(file),'submission_schemas.py')].filter(existsSync);return names.map(name=>{for(const path of sources){const source=readFileSync(path,'utf8');const start=source.indexOf(`class ${name}(BaseModel):`);if(start>=0){const next=source.slice(start+1).search(/\n(?:class |def |async def )/);return {name,source:path.replace('../',''),definition:source.slice(start,next<0?source.length:start+1+next)};}}return {name,status:'source declaration unresolved'};});}
function declaration(source, start) {
 let depth=1, quote=null, escaped=false;
 for(let index=start;index<source.length;index++) {
  const char=source[index];
  if(quote) { if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote=null;continue; }
  if(char==='"'||char==="'"){quote=char;continue;}
  if(char==='(')depth++;
  if(char===')'&&--depth===0)return source.slice(start,index);
 }
 throw new Error('Unclosed APIRouter declaration');
}
for(const file of files){
 const source=readFileSync(file,'utf8');
 const routers=Object.fromEntries([...source.matchAll(/(\w+)\s*=\s*APIRouter\(/g)].map(m=>{const body=declaration(source,m.index+m[0].length);return [m[1], {prefix:body.match(/prefix\s*=\s*"([^"]*)"/)?.[1]||'',declaration:body}];}));
 const matches=[...source.matchAll(/@(\w+)\.(get|post|patch|put|delete)\(\s*"([^"]*)"/g)];
 for(let i=0;i<matches.length;i++){
  const m=matches[i]; let contract=source.slice(m.index,matches[i+1]?.index??source.length);
  const functionStart=contract.indexOf('def ')+4;
  const boundary=contract.slice(functionStart).search(/\n(?=(?:[A-Za-z_]\w*\s*=|(?:async )?def |class |@))/);
  if(boundary>=0)contract=contract.slice(0,functionStart+boundary);
  const router=routers[m[1]]?.declaration||'';
  inventory.push({method:m[2].toUpperCase(),path:(routers[m[1]]?.prefix||'')+m[3],source:file.replace('../',''),router,contract,sha256:createHash('sha256').update(contract).digest('hex'),permissions:[...new Set([...(`${router}\n${contract}`).matchAll(/require_permission\("([^"]+)"\)/g)].map(v=>v[1]))],queryDeclarations:[...contract.matchAll(/(\w+)\s*:\s*[^\n=]+?=\s*Query\(([^\n]*)\)/g)].map(v=>({name:v[1],declaration:v[2]})),contentType:/\bForm\(|\bFile\(/.test(contract)?'multipart/form-data':/payload\s*:/.test(contract)?'application/json':'no body or source-defined',successStatus:Number(contract.match(/status_code\s*=\s*(\d+)/)?.[1]||200),behavioralFixtureStatus:'pending comprehensive request/response and side-effect parity'});
  const record=inventory.at(-1);record.inputModels=models(file,contract);record.frontendCallers=callers(record.path);
 }
}
inventory.sort((a,b)=>a.path.localeCompare(b.path)||a.method.localeCompare(b.method));
writeFileSync('docs/legacy-contracts.json',JSON.stringify(inventory,null,2)+'\n');
console.log(`Inventoried ${inventory.length} routes; source signatures/models and frontend endpoint selectors retained. Comprehensive behavioral fixtures remain pending.`);
