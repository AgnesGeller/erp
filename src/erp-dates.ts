function dateValue(value:string):Date {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Válassz érvényes dátumot.');
  const date=new Date(value+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Válassz érvényes dátumot.');
  return date;
}
export function projectPeriod(firstDay:string,lastDay:string):{from:string;until:string|null} {
  const first=dateValue(firstDay);
  if(!lastDay)return {from:firstDay+' 00:00:00 Europe/Budapest',until:null};
  const last=dateValue(lastDay);
  if(last<first)throw new Error('Az utolsó nap nem lehet korábbi a kezdőnapnál.');
  last.setUTCDate(last.getUTCDate()+1);
  return {from:firstDay+' 00:00:00 Europe/Budapest',until:last.toISOString().slice(0,10)+' 00:00:00 Europe/Budapest'};
}
export function todayBudapest():string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');
}
export function periodLabel(first:string,until:string|null):string {
  const fmt=new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',dateStyle:'medium'});
  return fmt.format(new Date(first))+' – '+(until?fmt.format(new Date(new Date(until).getTime()-1)):'visszavonásig');
}
