(()=>{
  const VAPID_PUBLIC='BBsZQlwNAh7exwSqgrNQp-54kGbIDs19nme95A8zZ_p_oo3VCYDPoC-iqc0OqtMCGw7o9GMt0z3O-DORxpBNrm8';
  const $=s=>document.querySelector(s);

  function bytes(base64){
    const padding='='.repeat((4-base64.length%4)%4);
    const raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }

  function inject(){
    if($('#coreAlertCard'))return;
    const stats=$('.view[data-view="home"] .stats-grid');
    if(!stats)return;
    const card=document.createElement('section');
    card.id='coreAlertCard';
    card.className='core-alert-card';
    card.innerHTML=`
      <div class="core-alert-icon">🔔</div>
      <div class="core-alert-copy">
        <div class="eyebrow">INSTANT CORE ALERTS</div>
        <h3 id="coreAlertTitle">Never miss a released signal</h3>
        <p id="coreAlertText">Enable alerts once and Positive Arena can notify this phone when a new Strong or Elite Core signal is released.</p>
      </div>
      <button id="homeNotificationBtn" class="core-alert-btn" type="button">Enable alerts</button>`;
    stats.insertAdjacentElement('afterend',card);

    const style=document.createElement('style');
    style.textContent=`
      .core-alert-card{margin:18px 0 26px;padding:18px;border:1px solid rgba(57,229,140,.22);background:linear-gradient(135deg,rgba(57,229,140,.075),rgba(243,200,104,.045));border-radius:24px;display:grid;grid-template-columns:auto 1fr;gap:13px 14px;align-items:start;box-shadow:0 16px 40px rgba(0,0,0,.12)}
      .core-alert-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:rgba(57,229,140,.11);border:1px solid rgba(57,229,140,.2);font-size:22px}
      .core-alert-copy h3{margin:4px 0 6px;font-size:19px;line-height:1.15}.core-alert-copy p{margin:0;color:var(--muted,#9bac9f);font-size:13px;line-height:1.55}
      .core-alert-btn{grid-column:1/-1;width:100%;border:0;border-radius:16px;padding:14px 16px;font-weight:950;font-size:14px;background:#39e58c;color:#06110c;box-shadow:0 10px 24px rgba(57,229,140,.12)}
      .core-alert-card.enabled{border-color:rgba(57,229,140,.34);background:rgba(57,229,140,.07)}.core-alert-card.enabled .core-alert-btn{background:#10281d;color:#6af3ad;border:1px solid rgba(57,229,140,.26);box-shadow:none}.core-alert-card.blocked{border-color:rgba(255,176,80,.24)}.core-alert-card.blocked .core-alert-btn{background:#261f12;color:#f6c96f;border:1px solid rgba(246,201,111,.22);box-shadow:none}
      @media(min-width:620px){.core-alert-card{grid-template-columns:auto 1fr auto;align-items:center}.core-alert-btn{grid-column:auto;width:auto;min-width:145px}.core-alert-copy p{max-width:540px}}
    `;
    document.head.appendChild(style);
  }

  async function save(sub){
    await window.PAF_AUTH_READY;
    const {data,error}=await window.PAF_SUPABASE.functions.invoke('football-push-register',{body:{subscription:sub.toJSON(),notify_core:true}});
    if(error||!data?.ok)throw new Error(data?.error||error?.message||'Could not register this phone for Core alerts.');
    return data;
  }

  function setState(state,message=''){
    const card=$('#coreAlertCard'),btn=$('#homeNotificationBtn'),title=$('#coreAlertTitle'),text=$('#coreAlertText');
    if(!card||!btn)return;
    card.classList.remove('enabled','blocked');
    btn.disabled=false;
    if(state==='enabled'){
      card.classList.add('enabled');
      btn.textContent='✓ Alerts enabled';
      title.textContent='Core alerts are on';
      text.textContent=message||'This phone is ready to receive new Strong and Elite Core releases.';
      const pbtn=$('#notificationBtn');if(pbtn){pbtn.classList.add('enabled');pbtn.textContent='🔔 Core Notifications Enabled';}
      const note=$('#notificationNote');if(note)note.textContent='This device is subscribed to new published Core signals.';
      return;
    }
    if(state==='blocked'){
      card.classList.add('blocked');
      btn.textContent='Notifications blocked';
      title.textContent='Allow notifications in your browser';
      text.textContent=message||'Notification permission is blocked for this site. Allow it in browser settings, then return here.';
      return;
    }
    if(state==='unsupported'){
      card.classList.add('blocked');btn.disabled=true;btn.textContent='Not supported';title.textContent='Notifications unavailable';text.textContent=message||'This browser cannot receive web push alerts.';return;
    }
    btn.textContent='Enable alerts';title.textContent='Never miss a released signal';text.textContent=message||'Enable alerts once and Positive Arena can notify this phone when a new Strong or Elite Core signal is released.';
  }

  async function syncExisting(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setState('unsupported');return;}
    if(Notification.permission==='denied'){setState('blocked');return;}
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(sub){
        try{await save(sub);}catch{}
        setState('enabled');
      }else setState('idle');
    }catch{setState('idle');}
  }

  async function enable(){
    const btn=$('#homeNotificationBtn');if(btn){btn.disabled=true;btn.textContent='Enabling…';}
    try{
      if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('This browser does not support web push notifications.');
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission!=='granted'){
        if(permission==='denied'){setState('blocked');return;}
        setState('idle','Permission was not granted. Tap Enable alerts when you are ready.');return;
      }
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(VAPID_PUBLIC)});
      await save(sub);
      setState('enabled','Done — this phone will be alerted when a new Core signal is released.');
    }catch(e){setState('idle',e?.message||String(e));}
    finally{const b=$('#homeNotificationBtn');if(b)b.disabled=false;}
  }

  async function boot(){
    inject();
    $('#homeNotificationBtn')?.addEventListener('click',enable);
    try{await window.PAF_AUTH_READY;}catch{}
    await syncExisting();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
