import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/erp-gateway/customers.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {createCustomerDirectory,customerPayload,normalizeCustomerSearch}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');const org=id(1),actor=id(101),customer=id(201),location=id(301);
const raw={full_name:'Új Teszt Ügyfél',address:'Teszt cím 4.',customer_type:'person',email:'teszt@example.invalid'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function setup(){
 const tables={customers:[{id:id(900),full_name:'Meglévő név',normalized_name:'meglévő név',active:true,review_status:'approved',archived_at:null}],customer_locations:[{id:id(901),customer_id:id(900),address:'Régi cím',active:true}],customer_details:[{customer_id:id(900),phone:'12345',email:'',notes:'Forrás megjegyzés'}],customer_contacts:[]};
 const original=JSON.stringify(tables);const requests=new Map();const calls=[];let failLocation=false,loseCustomerAck=false;
 const handle=createCustomerDirectory({url:'https://erp.invalid',key:'erp-private-secret',sourceKey:'source-private-secret',fetchImpl:async(url,options)=>{
  const u=new URL(url),method=options.method??'GET';const body=options.body?JSON.parse(options.body):undefined;calls.push({url:u.href,method,body,headers:options.headers});
  if(u.hostname==='erp.invalid'){
   assert.equal(options.headers.apikey,'erp-private-secret');
   const name=u.pathname.split('/').pop();
   if(name==='erp_customer_sync')return json(body.p_items.map(c=>({source_customer_id:c.id,person_id:id(501),revision:1})));
   if(name==='erp_customer_pending')return json([...requests.values()].filter(r=>r.status==='pending').map(r=>({request_id:r.request_id,full_name:r.payload.full_name})));
   if(name==='erp_customer_resume')return json(requests.get(body.p_request)??null);
   if(name==='erp_customer_begin'){
    let saved=requests.get(body.p_request);
    if(saved&&JSON.stringify(saved.payload)!==JSON.stringify(body.p_payload))return json({code:'40001'},409);
    if(!saved){saved={request_id:body.p_request,source_customer_id:customer,source_location_id:location,payload:body.p_payload,status:'pending',created_at:'2026-11-01T12:00:00.000Z'};requests.set(body.p_request,saved);}return json(saved);
   }
   if(name==='erp_customer_finish'){requests.get(body.p_request).status='complete';return json(null);}
   assert.fail('Nem várt ERP-művelet: '+name);
  }
  assert.equal(u.hostname,'wojgdfojupnfldrmqaht.supabase.co');assert.equal(options.headers.apikey,'source-private-secret');assert.equal(options.headers['Accept-Profile'],'munkalap');
  const table=u.pathname.split('/').pop();assert.ok(table in tables);
  if(method==='GET'){
   let rows=tables[table];for(const [key,value]of u.searchParams)if(value.startsWith('eq.'))rows=rows.filter(r=>String(r[key])===value.slice(3));
   const offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||500);return json(rows.slice(offset,offset+limit));
  }
  assert.equal(method,'POST','A forrás felé tilos módosítás vagy törlés');assert.doesNotMatch(String(options.headers.Prefer),/merge-duplicates/);
  if(table==='customer_locations'&&failLocation){failLocation=false;throw Error('Megszakadt kapcsolat');}
  if(table==='customers'&&tables.customers.some(r=>r.full_name===body.full_name))return json({code:'23505'},409);
  const row={...body};if(table==='customers')row.normalized_name=body.full_name.toLowerCase();tables[table].push(row);
  if(table==='customers'&&loseCustomerAck){loseCustomerAck=false;throw Error('Elveszett visszaigazolás');}
  return json([row]);
 }});
 const run=input=>handle({organization_id:org,...input},'verified-erp-jwt',actor,[{organization_id:org,is_office:true}]);
 return {tables,requests,calls,original,run,handle,setFailLocation:()=>{failLocation=true;},loseAck:()=>{loseCustomerAck=true;}};
}
test('Az ügyféladatok szerveroldali ellenőrzése és normalizálása',()=>{
 assert.equal(customerPayload({...raw,full_name:'  Új   Ügyfél  '}).full_name,'Új Ügyfél');
 assert.throws(()=>customerPayload({...raw,email:'rossz'}));assert.throws(()=>customerPayload({...raw,full_name:'x'}));assert.throws(()=>customerPayload({...raw,address:''}));assert.throws(()=>customerPayload({...raw,customer_type:'admin'}));
});
test('Irodai tagság nélkül a forrás sem olvasható, sem írható',async()=>{
 const h=setup();const r=await h.handle({action:'customers_list',organization_id:org},'token',actor,[{organization_id:org,is_office:false}]);assert.equal(r.status,403);assert.equal(h.calls.length,0);
});
test('A lista megőrzi az eredeti azonosítókat és csak olvassa a forrást',async()=>{
 const h=setup(),r=await h.run({action:'customers_list',query:'régi cím',field:'address'});assert.equal(r.data.rows.length,1);assert.equal(r.data.rows[0].id,id(900));assert.equal(r.data.rows[0].locations[0].id,id(901));assert.equal(JSON.stringify(h.tables),h.original);
 assert.ok(h.calls.filter(c=>c.url.includes('supabase.co')).every(c=>c.method==='GET'));assert.doesNotMatch(JSON.stringify(r),/private-secret/);
});
test('Új ügyfél mentése három beszúrás; az ismétlés nem hoz létre új ügyfelet',async()=>{
 const h=setup(),request=id(401);const result=await h.run({action:'customer_create',request_id:request,payload:raw});assert.equal(result.data.customer_id,customer);
 const again=await h.run({action:'customer_create',request_id:request,payload:raw});assert.equal(again.data.customer_id,customer);
 const posts=h.calls.filter(c=>c.url.includes('supabase.co')&&c.method==='POST');assert.equal(posts.length,3);assert.equal(posts[0].body.source_app,'erp');assert.ok(posts.every(c=>c.headers.Authorization==='Bearer source-private-secret'));
 assert.equal(h.tables.customers.find(c=>c.id===id(900)).full_name,'Meglévő név');assert.equal(h.tables.customer_details[0].notes,'Forrás megjegyzés');
 assert.ok(h.calls.every(c=>!['PATCH','PUT','DELETE'].includes(c.method)));assert.equal(h.requests.get(request).status,'complete');
});
test('Azonos nevű meglévő személyhez nem írunk, nem vonjuk össze automatikusan',async()=>{
 const h=setup(),r=await h.run({action:'customer_create',request_id:id(401),payload:{...raw,full_name:'Meglévő név'}});assert.equal(r.status,409);assert.equal(JSON.stringify(h.tables),h.original);assert.ok(h.calls.every(c=>c.method!=='PATCH'));assert.equal(h.calls.filter(c=>c.url.includes('supabase.co')&&c.method==='POST').length,0);
});
test('Hálózati hiba után ugyanaz a mentés folytatható, nincs néma részleges siker',async()=>{
 const h=setup();h.setFailLocation();const r=await h.run({action:'customer_create',request_id:id(401),payload:raw});assert.equal(r.status,503);assert.equal(h.requests.get(id(401)).status,'pending');
 const next=await h.run({action:'customer_resume',request_id:id(401)});assert.equal(next.data.customer_id,customer);assert.equal(h.tables.customers.filter(c=>c.id===customer).length,1);assert.equal(h.tables.customer_details.filter(c=>c.customer_id===customer).length,1);assert.equal(h.tables.customer_locations.filter(c=>c.id===location).length,1);assert.equal(h.requests.get(id(401)).status,'complete');
});
test('Az elveszett beszúrási visszaigazolás nem okoz duplikációt',async()=>{
 const h=setup();h.loseAck();const r=await h.run({action:'customer_create',request_id:id(401),payload:raw});assert.equal(r.data.customer_id,customer);assert.equal(h.tables.customers.filter(c=>c.id===customer).length,1);
});
test('Megváltozott új forrásrekordot sem írunk felül újrapróbáláskor',async()=>{
 const h=setup();h.setFailLocation();await h.run({action:'customer_create',request_id:id(401),payload:raw});h.tables.customers.find(c=>c.id===customer).full_name='Másik felületen javított név';const before=JSON.stringify(h.tables);const r=await h.run({action:'customer_resume',request_id:id(401)});assert.equal(r.status,409);assert.equal(JSON.stringify(h.tables),before);
});
test('Az archivált ügyfél megfeleltetése is megmarad, megjelenítése külön kapcsolható',async()=>{
 const h=setup();h.tables.customers.push({id:id(990),full_name:'Archivált személy',active:false,review_status:'approved',archived_at:'2026-10-01T00:00:00Z'});
 const normal=await h.run({action:'customers_list'});assert.equal(normal.data.rows.length,0);assert.equal(normal.data.total,1);assert.equal(normal.data.directory_total,2);assert.equal(normal.data.archived_total,1);
 const sync=h.calls.find(c=>c.url.endsWith('/erp_customer_sync'));assert.equal(sync.body.p_items.length,2);
 const all=await h.run({action:'customers_list',include_archived:true,query:'szem'});assert.equal(all.data.rows.length,1);assert.ok(all.data.rows.some(c=>c.id===id(990)));
});
test('Két karaktertől ékezetfüggetlen és kisbetű-nagybetű független keresés, magyar ABC-sorrend',async()=>{
 assert.equal(normalizeCustomerSearch('ÁÉÍÓÖŐÚÜŰ'),'aeiooouuu');const h=setup();
 const empty=await h.run({action:'customers_list',query:'é'});assert.equal(empty.data.rows.length,0);
 const name=await h.run({action:'customers_list',query:'MEGLEVO'});assert.equal(name.data.rows.length,1);
 const address=await h.run({action:'customers_list',query:'regi',field:'address'});assert.equal(address.data.rows.length,1);
 h.tables.customers.push({id:id(991),full_name:'Márton',active:true},{id:id(992),full_name:'Mária',active:true});
 const sorted=await h.run({action:'customers_list',query:'mar'});assert.deepEqual(sorted.data.rows.map(c=>c.full_name),['Mária','Márton']);
});
test('A keresés az adatértékekben keres, nem a mezőnevekben vagy a Magánszemély típusban',async()=>{
 const h=setup();h.tables.customer_locations[0].normalized_address='régi cím';h.tables.customer_details[0].customer_type='Magánszemély';
 assert.equal((await h.run({action:'customers_list',query:'ma'})).data.rows.length,0);
});