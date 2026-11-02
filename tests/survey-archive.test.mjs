import test from 'node:test';import assert from 'node:assert/strict';
import {exportSurvey,importSurvey,surveyHash} from '../assets/js/erp-survey-archive.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const photo=new Blob([new Uint8Array([255,216,255,0,1,2,3])],{type:'image/jpeg'});
const sha=await surveyHash(photo);
const row={id:id(501),owner:'PRIVATE-OWNER',revision:1,localVersion:1,dirty:false,customer_name:'Szintetikus ügyfél',site_address:'Helyi ellenőrzés',updated_at:'2026-11-02',document:{customer_id:id(201),location_id:id(301),title:'Felmérés',work_type:'construction',wishes:'',sections:[{id:id(401),name:'Ágyás',length:'',width:'',area:'',notes:'Eredeti jegyzet',media:[{id:id(701),kind:'photo',mime:'image/jpeg',size:photo.size,sha256:sha}]}]}};
test('Helyi csomag export/import: változatlan jegyzet, fájlazonosító és ellenőrzőösszeg',async()=>{const out=await exportSurvey(row,async()=>({blob:photo}));assert.equal(out.missing,0);const data=await importSurvey(new File([out.blob],'felmeres.zip'));assert.equal(data.id,row.id);assert.equal(data.document.sections[0].notes,'Eredeti jegyzet');assert.equal(await surveyHash(data.media[0].blob),sha);assert.equal(data.owner,undefined);});
test('Másik eszközön hiányzó melléklet jelzett; hamis siker nincs',async()=>{const out=await exportSurvey(row,async()=>undefined);assert.equal(out.missing,1);const data=await importSurvey(new File([out.blob],'felmeres.zip'));assert.equal(data.media.length,0);assert.equal(data.document.sections[0].media.length,1);});
test('Hibás helyi fájl nem csomagolható el és ismeretlen ZIP nem importálható',async()=>{await assert.rejects(exportSurvey(row,async()=>({blob:new Blob(['bad'])})),/ellenőrzőösszeg/);await assert.rejects(importSurvey(new File(['not zip'],'x.zip')));});
