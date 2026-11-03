import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=(await readFile('assets/js/erp-dialogs.js','utf8')).replaceAll('export function ','function ');const ctx={document:{querySelectorAll:()=>[],getElementById:()=>null},Event};vm.runInNewContext(source,ctx);
class Dialog extends EventTarget{open=true;closed=0;close(){this.open=false;this.closed++;}}
test('Az egységes × a saját mentésvédő cancel eseményt futtatja, és tiszteletben tartja a tiltást',()=>{const d=new Dialog();d.addEventListener('cancel',e=>e.preventDefault());assert.equal(ctx.requestDialogClose(d),false);assert.equal(d.open,true);assert.equal(d.closed,0);});
test('Mentésvédelmi tiltás nélkül az ablak azonnal bezárható, duplakattintás sem zár másik ablakot',()=>{const d=new Dialog();assert.equal(ctx.requestDialogClose(d),true);assert.equal(d.open,false);ctx.requestDialogClose(d);assert.equal(d.closed,1);});
