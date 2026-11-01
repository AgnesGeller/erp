import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const script=(await readFile(new URL('../assets/js/erp-customers.js',import.meta.url),'utf8')).replace('export class CustomerDirectory','class CustomerDirectory')+'\nglobalThis.Directory=CustomerDirectory;';
function harness(){const nodes=new Map(),timers=[];const element=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,value:'',handlers:{},textContent:'',className:'',addEventListener(t,f){this.handlers[t]=f;},reset(){},setAttribute(){},replaceChildren(){},querySelector(){return {textContent:''};},querySelectorAll(){return [];}});return nodes.get(id);};
 const context={document:{visibilityState:'visible',getElementById:element},window:{addEventListener(){}},setInterval(){},setTimeout(f){timers.push(f);return timers.length;},clearTimeout(){},confirm:()=>true};vm.runInNewContext(script,context);
 const calls=[];const api={customers:(action,args)=>new Promise(resolve=>calls.push({args,resolve}))};const directory=new context.Directory(api,()=>{});const rendered=[];directory.render=data=>rendered.push(data);return {directory,nodes,element,timers,calls,rendered};}
const result=name=>({rows:[{id:name}],pending:[],synced_at:new Date().toISOString()});
test('A betöltés közben módosított keresés frissítése nem vész el',async()=>{
 const h=harness();const first=h.directory.setOrganization('org');assert.equal(h.calls.length,1);
 h.element('customer-search').value='Új keresés';h.element('customer-search').handlers.input();h.timers.pop()();
 h.calls[0].resolve(result('stale'));await first;assert.equal(h.calls.length,2);assert.equal(h.calls[1].args.query,'Új keresés');assert.equal(h.rendered.length,0);
 h.calls[1].resolve(result('fresh'));await new Promise(resolve=>setImmediate(resolve));assert.equal(h.rendered[0].rows[0].id,'fresh');
});
test('Kijelentkezés után a későn megérkező ügyféladat nem jelenik meg',async()=>{
 const h=harness(),loading=h.directory.setOrganization('org');h.directory.reset();h.calls[0].resolve(result('private'));await loading;assert.equal(h.rendered.length,0);assert.equal(h.element('customer-view').hidden,true);
});