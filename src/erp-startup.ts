/** Indulási jelzés; nem dönt belépésről vagy jogosultságról. */
(()=>{
 const root=document.documentElement;
 root.dataset.erpStarting='loading';
 const timer=window.setTimeout(()=>{
  if(!root.dataset.erpStarting)return;
  root.dataset.erpStarting='failed';
  const status=document.getElementById('app-startup-status');
  if(status)status.textContent='Az alkalmazás megnyitása elakadt. Ellenőrizd az internetkapcsolatot, majd próbáld újra.';
  const retry=document.getElementById('app-startup-retry');if(retry)retry.hidden=false;
 },30000);
 window.addEventListener('erp:startup-ready',()=>{window.clearTimeout(timer);delete root.dataset.erpStarting;},{once:true});
 window.addEventListener('erp:before-update',event=>{if(root.dataset.erpStarting){event.preventDefault();const status=document.getElementById('app-startup-status');if(status&&root.dataset.erpStarting==='loading')status.textContent='Az alkalmazás még megnyílik. A Frissítés gombot ezután használhatod.';}},{capture:true});
 document.addEventListener('DOMContentLoaded',()=>{document.getElementById('app-startup-retry')?.addEventListener('click',()=>location.reload());},{once:true});
})();
