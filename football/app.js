(()=>{
  const VAPID_PUBLIC='BBsZQlwNAh7exwSqgrNQp-54kGbIDs19nme95A8zZ_p_oo3VCYDPoC-iqc0OqtMCGw7o9GMt0z3O-DORxpBNrm8';
  let signals=[];
  let results=[];
  let activeFilter='ALL';
  let deferredPrompt=null;

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  function todayWat(){return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date()).toUpperCase();}
  function watDayRange(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value;
    const start=new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00+01:00`);
    return {start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()};
  }
  function formatWatTime(value){if(!value)return '—';return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));}
  function formatWatDate(value){if(!value)return '—';return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));}
  function marketGroup(value=''){
    const v=String(value).toUpperCase();
    if(v==='BTTS'||v.includes('GG'))return 'BTTS';
    if(v==='O2.5'||v.includes('OVER 2.5'))return 'O2.5';
    if(v==='DRAW'||v==='X')return 'DRAW';
    if(v==='WIN'||v.includes(' WIN'))return 'WIN';
    if(v==='DOUBLE_CHANCE')return 'DOUBLE_CHANCE';
    return v||'OTHER';
  }

  function renderSignals(){
    const feed=$('#signalFeed');if(!feed)return;
    const rows=signals.filter(s=>activeFilter==='ALL'||marketGroup(s.market_group)===activeFilter);
    $('#todayCount').textContent=signals.length;
    $('#eliteCount').textContent=signals.filter(s=>String(s.grade).toUpperCase().includes('ELITE')).length;
    $('#strongCount').textContent=signals.filter(s=>String(s.grade).toUpperCase().includes('STRONG')).length;
    if(!rows.length){feed.innerHTML='<div class="empty-card"><b>No Core signal released yet.</b><br><br>Positive Arena only releases a selection after its evidence and contradiction gates pass.</div>';return;}
    feed.innerHTML=rows.map(s=>{
      const grade=String(s.grade||'STRONG CORE').toUpperCase(),gradeClass=grade.includes('ELITE')?'grade-elite':'grade-strong';
      const odds=s.odds!==null&&s.odds!==undefined?Number(s.odds).toFixed(2):'';
      const score=s.confidence!==null&&s.confidence!==undefined?Math.round(Number(s.confidence)):null;
      return `<article class="signal-card">
        <div class="signal-top"><div><div class="league">${esc(s.competition)}</div><h4>${esc(s.home_team)} vs ${esc(s.away_team)}</h4></div><span class="market-badge">${esc(s.selection)}</span></div>
        <div class="signal-meta"><span>${esc(formatWatTime(s.kickoff_at))} WAT</span>${odds?`<span>Odds ${esc(odds)}</span>`:''}<span>${esc(marketGroup(s.market_group))}</span><span class="${gradeClass}">${esc(grade)}</span>${score!=null?`<span>Engine ${score}/100</span>`:''}</div>
        ${s.rationale?`<p class="reason">${esc(s.rationale)}</p>`:''}
      </article>`;
    }).join('');
  }

  function renderResults(){
    const won=results.filter(r=>r.result_status==='WON').length,lost=results.filter(r=>r.result_status==='LOST').length,voided=results.filter(r=>r.result_status==='VOID').length,settled=won+lost;
    $('#wonCount').textContent=won;$('#lostCount').textContent=lost;$('#voidCount').textContent=voided;$('#strikeRate').textContent=settled?`${Math.round((won/settled)*100)}%`:'—';
    const note=$('#resultsNote'),list=$('#resultList');
    if(!results.length){if(note){note.hidden=false;note.textContent='No settled Positive Arena Football signals yet.';}if(list)list.innerHTML='';return;}
    if(note)note.hidden=true;
    if(list)list.innerHTML=results.map(r=>{
      const status=String(r.result_status||'').toUpperCase();
      const cls=status==='WON'?'grade-strong':status==='LOST'?'result-lost':'grade-elite';
      return `<article class="signal-card result-card">
        <div class="signal-top"><div><div class="league">${esc(r.competition)} · ${esc(formatWatDate(r.kickoff_at))}</div><h4>${esc(r.home_team)} vs ${esc(r.away_team)}</h4></div><span class="market-badge ${cls}">${esc(status)}</span></div>
        <div class="signal-meta"><span>${esc(r.selection)}</span>${r.result_score?`<span>FT ${esc(r.result_score)}</span>`:''}<span>${esc(r.grade||'CORE')}</span></div>
      </article>`;
    }).join('');
  }

  async function loadData(){
    await window.PAF_AUTH_READY;
    const sb=window.PAF_SUPABASE,{start,end}=watDayRange(),refresh=$('#refreshBtn');if(refresh){refresh.disabled=true;refresh.textContent='Loading…';}
    const [todayRes,resultsRes,adminRes]=await Promise.all([
      sb.from('football_signals').select('id,competition,home_team,away_team,kickoff_at,market_group,selection,odds,grade,confidence,rationale,result_status').eq('published',true).gte('kickoff_at',start).lt('kickoff_at',end).order('kickoff_at',{ascending:true}),
      sb.from('football_signals').select('id,competition,home_team,away_team,kickoff_at,selection,grade,result_status,result_score').eq('published',true).neq('result_status','PENDING').order('kickoff_at',{ascending:false}).limit(100),
      sb.from('football_admins').select('role').eq('user_id',window.PAF_SESSION.user.id).maybeSingle()
    ]);
    if(todayRes.error){console.error('Football signals load failed',todayRes.error);signals=[];const feed=$('#signalFeed');if(feed)feed.innerHTML='<div class="empty-card"><b>Could not load football signals.</b><br><br>Check your connection and try Refresh.</div>';}else{signals=todayRes.data||[];renderSignals();}
    results=resultsRes.error?[]:(resultsRes.data||[]);renderResults();
    const adminLink=$('#adminLink');if(adminLink&&!adminRes.error&&adminRes.data)adminLink.hidden=false;
    if(refresh){refresh.disabled=false;refresh.textContent='Refresh';}
  }

  function showView(name){$$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));window.scrollTo({top:0,behavior:'smooth'});}
  $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.nav)));
  $$('#homeFilters .chip').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;$$('#homeFilters .chip').forEach(b=>b.classList.toggle('active',b===btn));renderSignals();}));
  $('#refreshBtn')?.addEventListener('click',loadData);
  $('#todayLabel').textContent=todayWat();

  const base64ToBytes=base64=>{
    const padding='='.repeat((4-base64.length%4)%4),raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  };
  async function refreshNotificationUI(){
    const btn=$('#notificationBtn'),note=$('#notificationNote');if(!btn)return;
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){btn.disabled=true;btn.textContent='Notifications unavailable';if(note)note.textContent='This browser does not support web push notifications.';return;}
    try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){btn.classList.add('enabled');btn.textContent='🔔 Core Notifications Enabled';if(note)note.textContent='You will receive alerts when a new Core signal is published.';}else{btn.classList.remove('enabled');btn.textContent='🔔 Enable Core Notifications';}}catch{}
  }
  $('#notificationBtn')?.addEventListener('click',async()=>{
    const btn=$('#notificationBtn'),note=$('#notificationNote');btn.disabled=true;
    try{
      if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Push notifications are not supported on this browser.');
      const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notification permission was not granted.');
      const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToBytes(VAPID_PUBLIC)});
      await window.PAF_AUTH_READY;const {data,error}=await window.PAF_SUPABASE.functions.invoke('football-push-register',{body:{subscription:sub.toJSON(),notify_core:true}});if(error||!data?.ok)throw new Error(data?.error||error?.message||'Could not register notifications.');
      if(note)note.textContent='Notifications enabled. New published Core signals can alert this device.';
    }catch(e){if(note)note.textContent=e.message||String(e);}finally{btn.disabled=false;await refreshNotificationUI();}
  });

  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;const note=$('[data-install-note]');if(note)note.textContent='Ready to install on this phone.';});
  document.addEventListener('click',async event=>{
    const btn=event.target.closest('[data-install-app]');if(!btn)return;
    if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch{}deferredPrompt=null;return;}
    const note=$('[data-install-note]');if(note)note.textContent='Use your browser menu and choose Install app / Add to Home screen.';
  });

  if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await reg.update();await refreshNotificationUI();}catch{}});}
  renderSignals();renderResults();loadData().catch(err=>console.error('Football app startup failed',err));
})();