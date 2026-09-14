(()=>{
  let signals=[];
  let results=[];
  let activeFilter='ALL';
  let deferredPrompt=null;

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  function todayWat(){
    return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date()).toUpperCase();
  }

  function watDayRange(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value;
    const y=get('year'),m=get('month'),d=get('day');
    const start=new Date(`${y}-${m}-${d}T00:00:00+01:00`);
    return {start:start.toISOString(),end:new Date(start.getTime()+24*60*60*1000).toISOString()};
  }

  function formatWatTime(value){
    if(!value)return '—';
    return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
  }

  function marketGroup(value=''){
    const v=String(value).toUpperCase();
    if(v==='BTTS'||v.includes('GG'))return 'BTTS';
    if(v==='O2.5'||v.includes('OVER 2.5'))return 'O2.5';
    if(v==='DRAW'||v==='X')return 'DRAW';
    if(v==='WIN'||v.includes(' WIN'))return 'WIN';
    return v||'OTHER';
  }

  function renderSignals(){
    const feed=$('#signalFeed');
    if(!feed)return;
    const rows=signals.filter(s=>activeFilter==='ALL'||marketGroup(s.market_group)===activeFilter);
    $('#todayCount').textContent=signals.length;
    $('#eliteCount').textContent=signals.filter(s=>String(s.grade).toUpperCase().includes('ELITE')).length;
    $('#strongCount').textContent=signals.filter(s=>String(s.grade).toUpperCase().includes('STRONG')).length;

    if(!rows.length){
      feed.innerHTML='<div class="empty-card"><b>No Core signal released yet.</b><br><br>Positive Arena will show a selection only after it clears the full qualification and contradiction gates.</div>';
      return;
    }

    feed.innerHTML=rows.map(s=>{
      const grade=String(s.grade||'STRONG CORE').toUpperCase();
      const gradeClass=grade.includes('ELITE')?'grade-elite':'grade-strong';
      const odds=s.odds!==null&&s.odds!==undefined?Number(s.odds).toFixed(2):'';
      return `<article class="signal-card">
        <div class="signal-top">
          <div><div class="league">${esc(s.competition)}</div><h4>${esc(s.home_team)} vs ${esc(s.away_team)}</h4></div>
          <span class="market-badge">${esc(s.selection)}</span>
        </div>
        <div class="signal-meta">
          <span>${esc(formatWatTime(s.kickoff_at))} WAT</span>
          ${odds?`<span>Odds ${esc(odds)}</span>`:''}
          <span>${esc(marketGroup(s.market_group))}</span>
          <span class="${gradeClass}">${esc(grade)}</span>
        </div>
        ${s.rationale?`<p class="reason">${esc(s.rationale)}</p>`:''}
      </article>`;
    }).join('');
  }

  function renderResults(){
    const won=results.filter(r=>r.result_status==='WON').length;
    const lost=results.filter(r=>r.result_status==='LOST').length;
    const voided=results.filter(r=>r.result_status==='VOID').length;
    const settled=won+lost;
    $('#wonCount').textContent=won;
    $('#lostCount').textContent=lost;
    $('#voidCount').textContent=voided;
    $('#strikeRate').textContent=settled?`${Math.round((won/settled)*100)}%`:'—';
    const note=$('#resultsNote');
    if(note)note.innerHTML=results.length?`<b>${results.length} settled signal${results.length===1?'':'s'} tracked.</b><br><br>Strike rate excludes void selections.`:'No settled Positive Arena Football signals yet.';
  }

  async function loadData(){
    await window.PAF_AUTH_READY;
    const sb=window.PAF_SUPABASE;
    const {start,end}=watDayRange();
    const refresh=$('#refreshBtn');
    if(refresh){refresh.disabled=true;refresh.textContent='Loading…';}

    const [todayRes,resultsRes,adminRes]=await Promise.all([
      sb.from('football_signals')
        .select('id,competition,home_team,away_team,kickoff_at,market_group,selection,odds,grade,confidence,rationale,result_status')
        .eq('published',true)
        .gte('kickoff_at',start)
        .lt('kickoff_at',end)
        .order('kickoff_at',{ascending:true}),
      sb.from('football_signals')
        .select('id,result_status,kickoff_at')
        .eq('published',true)
        .neq('result_status','PENDING')
        .order('kickoff_at',{ascending:false})
        .limit(200),
      sb.from('football_admins')
        .select('role')
        .eq('user_id',window.PAF_SESSION.user.id)
        .maybeSingle()
    ]);

    if(todayRes.error){
      console.error('Football signals load failed',todayRes.error);
      signals=[];
      const feed=$('#signalFeed');
      if(feed)feed.innerHTML='<div class="empty-card"><b>Could not load football signals.</b><br><br>Check your connection and try Refresh.</div>';
    }else{
      signals=todayRes.data||[];
      renderSignals();
    }

    if(resultsRes.error){
      console.error('Football results load failed',resultsRes.error);
      results=[];
    }else{
      results=resultsRes.data||[];
    }
    renderResults();

    const adminLink=$('#adminLink');
    if(adminLink&&!adminRes.error&&adminRes.data)adminLink.hidden=false;

    if(refresh){refresh.disabled=false;refresh.textContent='Refresh';}
  }

  function showView(name){
    $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.nav)));
  $$('#homeFilters .chip').forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.filter;
    $$('#homeFilters .chip').forEach(b=>b.classList.toggle('active',b===btn));
    renderSignals();
  }));

  $('#refreshBtn')?.addEventListener('click',loadData);
  $('#todayLabel').textContent=todayWat();

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    const note=$('[data-install-note]');
    if(note)note.textContent='Ready to install on this phone.';
  });

  document.addEventListener('click',async event=>{
    const btn=event.target.closest('[data-install-app]');
    if(!btn)return;
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch{}
      deferredPrompt=null;
      return;
    }
    const note=$('[data-install-note]');
    if(note)note.textContent='Use your browser menu and choose Install app / Add to Home screen.';
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{}));
  }

  renderSignals();
  renderResults();
  loadData().catch(err=>console.error('Football app startup failed',err));
})();