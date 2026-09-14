(()=>{
  let deferredPrompt=null;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

  function buttons(){return Array.from(document.querySelectorAll('[data-install-app]'))}
  function notes(){return Array.from(document.querySelectorAll('[data-install-note]'))}
  function setNote(text){notes().forEach(el=>{el.textContent=text})}
  function updateUI(){
    const installed=isStandalone();
    buttons().forEach(btn=>{
      btn.hidden=installed;
      btn.disabled=false;
      btn.textContent='Install Positive Arena App';
    });
    if(installed)setNote('Positive Arena Gold is installed on this device.');
    else if(isIOS)setNote('On iPhone/iPad: tap Share, then Add to Home Screen.');
    else if(deferredPrompt)setNote('Install the app for a full-screen Gold dashboard and quick home-screen access.');
    else setNote('If the install prompt does not appear, use your browser menu and choose Install app or Add to Home screen.');
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    updateUI();
  });

  document.addEventListener('click',async event=>{
    const btn=event.target.closest('[data-install-app]');
    if(!btn)return;
    if(isStandalone()){
      setNote('Positive Arena Gold is already installed on this device.');
      return;
    }
    if(deferredPrompt){
      btn.disabled=true;
      btn.textContent='Opening install…';
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch{}
      deferredPrompt=null;
      btn.disabled=false;
      updateUI();
      return;
    }
    if(isIOS){
      setNote('To install: open this page in Safari → tap Share → Add to Home Screen → Add.');
    }else{
      setNote('Open your browser menu (⋮) and choose Install app or Add to Home screen.');
    }
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    setNote('Positive Arena Gold installed successfully.');
    updateUI();
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
        await reg.update();
      }catch(err){
        console.warn('PWA service worker registration failed',err);
      }
    });
  }

  document.addEventListener('DOMContentLoaded',updateUI);
  updateUI();
})();
