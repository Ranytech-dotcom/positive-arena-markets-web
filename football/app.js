(()=>{
  const VAPID_PUBLIC='BBsZQlwNAh7exwSqgrNQp-54kGbIDs19nme95A8zZ_p_oo3VCYDPoC-iqc0OqtMCGw7o9GMt0z3O-DORxpBNrm8';
  let signals=[];
  let results=[];
  let activeFilter='ALL';
  let deferredPrompt=null;
  let loading=false;
  let lastUpdatedAt=null;

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
  function sourceLabel(value=''){
    const v=String(value).toLowerCase();
    if(v==='sportmonks')return 'SportMonks';
    if(v==='espn')return 'ESPN';
    if(v==='thesportsdb')return 'TheSportsDB';
    return value?String(value):'';
  }
  function updateLastUpdated(){
    const el=$('#lastUpdated');if(!el)return;
    el.textContent=lastUpdatedAt?`Live • Updated ${formatWatTime(lastUpdatedAt)} WAT`:'Live • Auto-updating';
  }

  function renderSignals(){
    const feed=$('#signalFeed');if(!feed)return;
    const now=Date.now();
    const upcoming=signals.filter(s=>new Date(s.kickoff_at).getTime()>now);
    const rows=upcoming.filter(s=>activeFilter==='ALL'||marketGroup(s.market_group)===activeFilter);
    $('#todayCount').textContent=upcoming.length;
    $('#eliteCount').textContent=upcoming.filter(s=>String(s.grade).toUpperCase().includes('ELITE')).length;
    $('#strongCount').textContent=upcoming.filter(s=>String(s.grade).toUpperCase().includes('STRONG')).length;
    if(!rows.length){feed.innerHTML='<div class="empty-card"><b>No upcoming Core signal released yet.</b><br><br>Positive Arena only shows signals that have passed every release gate and have not kicked off.</div>';return;}
    feed.innerHTML=rows.map(s=>{
      const grade=String(s.grade||'STRONG CORE').toUpperCase(),gradeClass=grade.includes('ELITE')?'grade-elite':'grade-strong';
      const odds=s.odds!==null&&s.odds!==undefined?Number(s.odds).toFixed(2):'';
      const score=s.confidence!==null&&s.confidence!==undefined?Math.round(Number(s.confidence)):null;
      return `<article class="signal-card">
        <div class="signal-top"><div><div class="league">${esc(s.competition)}</div><h4>${esc(s.home_team)} vs ${esc(s.away_team)}</h4></div><span class="market-badge">${esc(s.selection)}</span></div>
        <div class="signal-meta"><span>${esc(formatWatTime(s.kickoff_at))} WAT</span>${odds?`<span>Odds ${esc(odds)}</span>`:''}<span>${esc(marketGroup(s.market_group))}</span><span class="${gradeClass}">${esc(grade)}</span>${score!=null?`<span>Model score ${score}/100</span>`:''}</div>
        ${s.rationale?`<p class="reason">${esc(s.rationale)}</p>`:''}
      </article>`;
    }).join('');
  }

  function renderResults(){
    const won=results.filter(r=>r.result_status==='WON').length;
    const lost=results.filter(r=>r.result_status==='LOST').length;
    const voided=results.filter(r=>r.result_status==='VOID').length;
    const settled=won+lost;
    $('#wonCount').textContent=won;$('#lostCount').textContent=lost;$('#voidCount').textContent=voided;$('#strikeRate').textContent=settled?`${Math.round((won/settled)*100)}%`:'—';
    const note=$('#resultsNote'),list=$('#resultList');
    if(!results.length){if(note){note.hidden=false;note.textContent='No started or settled Positive Arena Football signals yet.';}if(list)list.innerHTML='';return;}
    if(note)note.hidden=true;
    if(list)list.innerHTML=results.map(r=>{
      const status=String(r.result_status||'PENDING').toUpperCase();
      const cls=status==='WON'?'result-won':status==='LOST'?'result-lost':status==='VOID'?'result-void':'result-pending';
      const score=r.result_score?`FT ${r.result_score}`:'';
      const src=sourceLabel(r.result_source);
      const noteText=status==='PENDING'
        ? 'Match started • awaiting confirmed final result.'
        : `${status==='WON'?'Selection won':status==='LOST'?'Selection lost':'Selection void'} • final result confirmed automatically${src?` via ${src}`:''}.`;
      return `<article class="signal-card result-card ${cls}">
        <div class="signal-top"><div><div class="league">${esc(r.competition)} · ${esc(formatWatDate(r.kickoff_at))}</div><h4>${esc(r.home_team)} vs ${esc(r.away_team)}</h4></div><span class="market-badge result-status ${cls}">${esc(status)}</span></div>
        <div class="signal-meta"><span>${esc(r.selection)}</span>${score?`<span class="final-score">${esc(score)}</span>`:''}<span>${esc(r.grade||'CORE')}</span></div>
        <p class="result-note ${cls}">${esc(noteText)}</p>
      </article>`;
    }).join('');
  }

  async function loadData({silent=false}={}){
    if(loading)return;
    loading=true;
    const refresh=$('#refreshBtn');
    try{
      await window.PAF_AUTH_READY;
      const sb=window.PAF_SUPABASE,{start,end}=watDayRange(),nowIso=new Date().toISOString();
      if(refresh&&!silent){refresh.disabled=true;refresh.textContent='Loading…';}
      $('#todayLabel').textContent=todayWat();
      const [todayRes,resultsRes,adminRes]=await Promise.all([
        sb.from('football_signals').select('id,competition,home_team,away_team,kickoff_at,market_group,selection,odds,grade,confidence,rationale,result_status').eq('published',true).gte('kickoff_at',start).lt('kickoff_at',end).gt('kickoff_at',nowIso).order('kickoff_at',{ascending:true}),
        sb.from('football_signals').select('id,competition,home_team,away_team,kickoff_at,selection,grade,result_status,result_score,result_source,settled_at').eq('published',true).lte('kickoff_at',nowIso).order('kickoff_at',{ascending:false}).limit(100),
        sb.from('football_admins').select('role').eq('user_id',window.PAF_SESSION.user.id).maybeSingle()
      ]);
      if(todayRes.error){console.error('Football signals load failed',todayRes.error);signals=[];const feed=$('#signalFeed');if(feed)feed.innerHTML='<div class="empty-card"><b>Could not load football signals.</b><br><br>Check your connection and try Refresh.</div>';}else{signals=todayRes.data||[];renderSignals();}
      results=resultsRes.error?[]:(resultsRes.data||[]);renderResults();
      const adminLink=$('#adminLink');if(adminLink&&!adminRes.error&&adminRes.data)adminLink.hidden=false;
      lastUpdatedAt=new Date();updateLastUpdated();
    }finally{
      if(refresh){refresh.disabled=false;refresh.textContent='Refresh';}
      loading=false;
    }
  }

  function showView(name,{scroll=true,updateHash=true}={}){
    const allowed=['home','core','results','profile'];
    if(!allowed.includes(name))name='home';
    $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
    if(updateHash){const base=location.pathname+location.search;history.replaceState(null,'',name==='home'?base:`${base}#${name}`);}
    if(scroll)window.scrollTo({top:0,behavior:'smooth'});
  }
  $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.nav)));
  $$('#homeFilters .chip').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;$$('#homeFilters .chip').forEach(b=>b.classList.toggle('active',b===btn));renderSignals();}));
  $('#refreshBtn')?.addEventListener('click',()=>loadData());
  $('#todayLabel').textContent=todayWat();
  updateLastUpdated();

  const initialView=String(location.hash||'').replace('#','').toLowerCase();
  if(['core','results','profile'].includes(initialView))showView(initialView,{scroll:false,updateHash:false});
  window.addEventListener('hashchange',()=>{const v=String(location.hash||'').replace('#','').toLowerCase()||'home';showView(v,{scroll:false,updateHash:false});if(v==='results')loadData({silent:true}).catch(()=>{});});

  const base64ToBytes=base64=>{
    const padding='='.repeat((4-base64.length%4)%4),raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  };
  async function refreshNotificationUI(){
    const btn=$('#notificationBtn'),note=$('#notificationNote');if(!btn)return;
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){btn.disabled=true;btn.textContent='Notifications unavailable';if(note)note.textContent='This browser does not support web push notifications.';return;}
    try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){btn.classList.add('enabled');btn.textContent='🔔 Football Alerts Enabled';if(note)note.textContent='You will receive new Core releases and confirmed final results.';}else{btn.classList.remove('enabled');btn.textContent='🔔 Enable Football Alerts';}}catch{}
  }
  $('#notificationBtn')?.addEventListener('click',async()=>{
    const btn=$('#notificationBtn'),note=$('#notificationNote');btn.disabled=true;
    try{
      if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Push notifications are not supported on this browser.');
      const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notification permission was not granted.');
      const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToBytes(VAPID_PUBLIC)});
      await window.PAF_AUTH_READY;const {data,error}=await window.PAF_SUPABASE.functions.invoke('football-push-register',{body:{subscription:sub.toJSON(),notify_core:true,notify_results:true}});if(error||!data?.ok)throw new Error(data?.error||error?.message||'Could not register notifications.');
      if(note)note.textContent='Notifications enabled. New Core signals and confirmed results can alert this device.';
    }catch(e){if(note)note.textContent=e.message||String(e);}finally{btn.disabled=false;await refreshNotificationUI();}
  });

  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;const note=$('[data-install-note]');if(note)note.textContent='Ready to install on this phone.';});
  document.addEventListener('click',async event=>{
    const btn=event.target.closest('[data-install-app]');if(!btn)return;
    if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch{}deferredPrompt=null;return;}
    const note=$('[data-install-note]');if(note)note.textContent='Use your browser menu and choose Install app / Add to Home screen.';
  });

  if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await reg.update();await refreshNotificationUI();}catch{}});}

  setInterval(()=>{renderSignals();},30000);
  setInterval(()=>{loadData({silent:true}).catch(err=>console.error('Football auto refresh failed',err));},120000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadData({silent:true}).catch(()=>{});});

  renderSignals();renderResults();loadData().catch(err=>console.error('Football app startup failed',err));
})();