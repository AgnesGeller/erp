import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../assets/js/main.js',import.meta.url),'utf8')).replace(/export \{\};?/, '');
function harness({offline=false,standalone=false,userAgent='test',platform='test',maxTouchPoints=0,pendingRelease,serviceWorker}={}) {
 const nodes=new Map();
 const listeners={};
 for(const id of ['install','update','install-guide','guide-title','guide-content','close-guide','install-status','update-status','version']){
  nodes.set(id,{textContent:'',className:'',disabled:false,handlers:{},addEventListener(t,f){this.handlers[t]=f;},querySelector(){return this;},showModal(){this.open=true;},close(){this.open=false;}});
 }
 const session=new Map(pendingRelease ? [['erp-update-completed', pendingRelease]] : []);
 const context={
  document:{querySelector(sel){if(sel==='#install-status.success') return nodes.get('install-status').className.includes('success')?nodes.get('install-status'):null;return nodes.get(sel.slice(1));},getElementById(id){return nodes.get(id);}},
  window:{dispatchEvent:()=>true,matchMedia:()=>({matches:standalone}),addEventListener(t,f){listeners[t]=f;}},
  navigator:{userAgent,platform,maxTouchPoints,...(serviceWorker?{serviceWorker}: {})},
  sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
  location:{reload(){context.reloaded=true;}},
  fetch:async()=>{if(offline)throw Error('offline');return {ok:true,json:async()=>({version:'0.1.8'})};},
  AbortSignal,Date,Event,setTimeout,clearTimeout
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
 caches:{keys:async()=>['kassza-v1','diszkertek-erp-0.0.1','diszkertek-erp-0.1.8','munkalap-v2'],delete:async k=>deleted.push(k)}};
 vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
 let pending;handlers.activate({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(deleted,['diszkertek-erp-0.0.1']);assert.equal(claimed,true);
 for(const url of ['https://example.supabase.co/rest/v1/customers','https://agnesgeller.github.io/munkalap/','https://agnesgeller.github.io/erp/version.json']){
  handlers.fetch({request:{method:'GET',url},respondWith(){assert.fail('Unrelated request intercepted');}});
 }
});


test('iPad with desktop identity receives iPad installation steps',async()=>{
 const h=harness({userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:5});await h.nodes.get('install').handlers.click();
 assert.match(h.nodes.get('guide-title').textContent,/iPad/);assert.match(h.nodes.get('guide-content').textContent,/Megosztás/);
 assert.doesNotMatch(h.nodes.get('install-status').textContent,/Sikeres/);
});
test('Viber points to external browser instead of pretending to install',async()=>{
 const h=harness({userAgent:'Android Viber'});await h.nodes.get('install').handlers.click();
 assert.match(h.nodes.get('guide-content').textContent,/Megnyitás böngészőben/);
 assert.doesNotMatch(h.nodes.get('install-status').textContent,/Sikeres/);
});

test('ERP manifest identity resolves to its own path from the origin',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 const origin='https://agnesgeller.github.io/';
 const manifestUrl=new URL('erp/manifest.webmanifest',origin);
 const start=new URL(manifest.start_url,manifestUrl);
 // The manifest standard resolves id against the START URL ORIGIN, not its directory.
 const identity=new URL(manifest.id,start.origin+'/');
 const scope=new URL(manifest.scope,manifestUrl);
 assert.equal(identity.href,origin+'erp/');
 assert.equal(scope.href,origin+'erp/');
 assert.equal(start.pathname,'/erp/');
 assert.notEqual(identity.href,new URL('./',start.origin+'/').href);
 assert.ok(!scope.pathname.startsWith('/manager/'));
});
test('Reloading a stale release cannot display successful update',()=>{
 const h=harness({pendingRelease:'9.9.9'});
 assert.match(h.nodes.get('update-status').className,/error/);
 assert.doesNotMatch(h.nodes.get('update-status').textContent,/Sikeres/);
});
test('Confirmed target release after reload displays success',()=>{
 const h=harness({pendingRelease:'0.1.8'});
 assert.match(h.nodes.get('update-status').textContent,/✓ Sikeres frissítés/);
});
test('A native prompt takes priority over an enclosing standalone app window',async()=>{
 const h=harness({standalone:true});let opened=false;
 h.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{opened=true;},userChoice:Promise.resolve({outcome:'dismissed'})});
 await h.nodes.get('install').handlers.click();assert.equal(opened,true);
});

test('Versioned ERP launch URL falls back to its own cached page offline',async()=>{
 const handlers={};let cacheKey;let answer;
 const context={URL,
  self:{registration:{scope:'https://agnesgeller.github.io/erp/'},addEventListener:(t,f)=>handlers[t]=f},
  caches:{open:async()=>({match:async key=>{cacheKey=key;return 'offline-erp-page';}})},
  fetch:async()=>{throw Error('offline');}
 };
 vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
 handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://agnesgeller.github.io/erp/?app-version=0.1.8'},respondWith:p=>answer=p});
 assert.equal(await answer,'offline-erp-page');assert.equal(cacheKey,'https://agnesgeller.github.io/erp/');
 handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://agnesgeller.github.io/napi/'},respondWith(){assert.fail('Other app intercepted');}});
});
