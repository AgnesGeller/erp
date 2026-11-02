/** Megjelenítéshez kerekít; a számítási motor bemenetét nem módosítja. */
export function quoteNumber(value:unknown,localized=true):string{
 if(value===null||value===undefined||value==='')return '—';
 let raw=String(value).replace(',','.');if(!/^-?\d+(?:\.\d*)?$/.test(raw)){const n=Number(value);if(!Number.isFinite(n)||Math.abs(n)>=1e15)return '—';raw=n.toFixed(6);}
 const negative=raw.startsWith('-'),[whole,fraction='']=raw.replace(/^-/,'').split('.');
 let scaled=BigInt(whole)*100n+BigInt((fraction+'00').slice(0,2));if(Number(fraction[2]??'0')>=5)scaled++;
 const integral=scaled/100n,decimal=String(scaled%100n).padStart(2,'0').replace(/0+$/,'');
 return (negative&&scaled>0n?'-':'')+(localized?integral.toLocaleString('hu-HU'):String(integral))+(decimal?(localized?',':'.')+decimal:'');
}
export function quoteInput(value:unknown,precise=false){if(value===null||value===undefined||value==='')return '';return precise?String(value).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,''):quoteNumber(value,false).replace('—','');}
export class EditHistory<T>{
 private past:T[]=[];private future:T[]=[];private present:T|undefined;private group:unknown;private time=0;
 constructor(private limit=50){}
 reset(value?:T){this.past=[];this.future=[];this.present=value===undefined?undefined:structuredClone(value);this.group=undefined;this.time=0;}
 remember(value:T,group?:unknown){if(this.present===undefined){this.reset(value);return;}if(JSON.stringify(this.present)===JSON.stringify(value))return;
 const now=Date.now();if(!group||group!==this.group||now-this.time>800){this.past.push(structuredClone(this.present));if(this.past.length>this.limit)this.past.shift();}
 this.present=structuredClone(value);this.future=[];this.group=group;this.time=now;}
 get canUndo(){return this.past.length>0;}get canRedo(){return this.future.length>0;}get initialized(){return this.present!==undefined;}
 undo(){if(!this.past.length||this.present===undefined)return;this.future.push(structuredClone(this.present));this.present=this.past.pop()!;this.group=undefined;return structuredClone(this.present);}
 redo(){if(!this.future.length||this.present===undefined)return;this.past.push(structuredClone(this.present));this.present=this.future.pop()!;this.group=undefined;return structuredClone(this.present);}
}
export type MailFields={to:string;subject:string;body:string};
export function mailLinks(fields:MailFields){const q=(s:string)=>encodeURIComponent(s);return {
 default:'mailto:'+q(fields.to)+'?subject='+q(fields.subject)+'&body='+q(fields.body),
 gmail:'https://mail.google.com/mail/?view=cm&fs=1&to='+q(fields.to)+'&su='+q(fields.subject)+'&body='+q(fields.body),
 outlook:'https://outlook.office.com/mail/deeplink/compose?to='+q(fields.to)+'&subject='+q(fields.subject)+'&body='+q(fields.body),
 yahoo:'https://compose.mail.yahoo.com/?to='+q(fields.to)+'&subject='+q(fields.subject)+'&body='+q(fields.body)
};}
function base64(bytes:Uint8Array){let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(raw);}
function encodedHeader(value:string){const words:string[]=[];let buffer='';for(const c of value){if(new TextEncoder().encode(buffer+c).length>36){words.push('=?UTF-8?B?'+base64(new TextEncoder().encode(buffer))+'?=');buffer='';}buffer+=c;}if(buffer)words.push('=?UTF-8?B?'+base64(new TextEncoder().encode(buffer))+'?=');return words.join('\r\n ');}
const lines=(value:string)=>value.match(/.{1,76}/g)?.join('\r\n')??'';
export function emailDraft(fields:MailFields,pdf:string,filename:string,boundary:string){
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fields.to)||/[\r\n]/.test(fields.to+fields.subject)||!fields.subject.trim()||fields.subject.length>200||fields.body.length>20000)throw Error('Ellenőrizd a levél címzettjét, tárgyát és szövegét.');
 if(!/^[A-Za-z0-9._-]+\.pdf$/.test(filename)||!/^[A-Za-z0-9_-]+$/.test(boundary)||!/^[A-Za-z0-9+/]*={0,2}$/.test(pdf))throw Error('A levélmelléklet nem készíthető elő.');
 return ['To: '+fields.to,'Subject: '+encodedHeader(fields.subject),'MIME-Version: 1.0','X-Unsent: 1','Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',lines(base64(new TextEncoder().encode(fields.body))),'--'+boundary,'Content-Type: application/pdf; name="'+filename+'"','Content-Disposition: attachment; filename="'+filename+'"','Content-Transfer-Encoding: base64','',lines(pdf),'--'+boundary+'--',''].join('\r\n');
}
