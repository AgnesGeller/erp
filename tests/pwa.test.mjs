import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../assets/js/main.js',import.meta.url),'utf8')).replace(/export \{\};?/, '');
function harness({offline=false,standalone=false,serviceWorker}={}) {
 const nodes=new Map();
 const listeners={};
 for(const id of ['install','update','install-guide','guide-content','close-guide','install-status','update-status','version']){
  nodes.set(id,{textContent:'',className:'',disabled:false,handlers:{},addEventListener(t,f){this.handlers[t]=f;},querySelector(){return this;},showModal(){this.open=true;},close(){this.open=false;}});
 }
 const session=new Map();
 const context={
  document:{querySelector(sel){if(sel==='#install-status.success') return nodes.get('install-status').className.includes('success')?nodes.get('install-status'):null;return nodes.get(sel.slice(1));},getElementById(id){return nodes.get(id);}},
  window:{matchMedia:()=>({matches:standalone}),addEventListener(t,f){listeners[t]=f;}},
  navigator:{userAgent:'test',platform:'test',maxTouchPoints:0,...(serviceWorker?{serviceWorker}: {})},
  sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
  location:{reload(){context.reloaded=true;}},
  fetch:async()=>{if(offline)throw Error('offline');return {ok:true,json:async()=>({version:'0.1.0'})};},
  AbortSignal,Date,setTimeout,clearTimeout
 };
 vm.runInNewContext(source,context);
 return {nodes,listeners,context};
}
test('Unsupported install shows instructions without false success',async()=>{
 const h=harness();await h.nodes.get('install').handlers.click();
 assert.equal(h.nodes.get('install-guide').open,true);
 assert.doesNotMatch(h.nodes.get('install-status').textContent,/Sikeres/);
});
test('Accepted prompt waits for actual installation confirmation',async()=>{
 const h=harness();h.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});
 await h.nodes.get('install').handlers.click();
 assert.doesNotMatch(h.nodes.get('install-status').textContent,/Sikeres/);
 h.listeners.appinstalled();
 assert.match(h.nodes.get('install-status').textContent,/✓ Sikeres/);
});
test('Dismissed installation does not show success',async()=>{
 const h=harness();h.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});
 await h.nodes.get('install').handlers.click();
 assert.match(h.nodes.get('install-status').textContent,/megszakítottad/);
 assert.equal(h.nodes.get('install').disabled,false);
});
test('Offline update gives error and enables retry',async()=>{
 const h=harness({offline:true});await h.nodes.get('update').handlers.click();
 assert.match(h.nodes.get('update-status').className,/error/);
 assert.doesNotMatch(h.nodes.get('update-status').textContent,/Sikeres/);
 assert.equal(h.nodes.get('update').disabled,false);
});
test('Healthy current release gives successful check',async()=>{
 const h=harness();await h.nodes.get('update').handlers.click();
 assert.match(h.nodes.get('update-status').textContent,/✓ Sikeres ellenőrzés/);
});
test('SW registration failure cannot claim successful update',async()=>{
 const h=harness({serviceWorker:{register:async()=>{throw Error('denied');},addEventListener(){}}});
 await h.nodes.get('update').handlers.click();
 assert.match(h.nodes.get('update-status').className,/error/);
});
test('ERP worker never removes another app cache or handles API traffic',async()=>{
 const handlers={};const deleted=[];let claimed=false;
 const context={URL,self:{registration:{scope:'https://agnesgeller.github.io/erp/'},clients:{claim:async()=>{claimed=true;}},addEventListener:(t,f)=>handlers[t]=f},
 caches:{keys:async()=>['kassza-v1','diszkertek-erp-0.0.1','diszkertek-erp-0.1.0','munkalap-v2'],delete:async k=>deleted.push(k)}};
 vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
 let pending;handlers.activate({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(deleted,['diszkertek-erp-0.0.1']);assert.equal(claimed,true);
 for(const url of ['https://example.supabase.co/rest/v1/customers','https://agnesgeller.github.io/munkalap/','https://agnesgeller.github.io/erp/version.json']){
  handlers.fetch({request:{method:'GET',url},respondWith(){assert.fail('Unrelated request intercepted');}});
 }
});

