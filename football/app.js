(()=>{
  const signals=[];
  const results=[];
  let activeFilter='ALL';
  let deferredPrompt=null;

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  function todayWat(){
    return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date()).toUpperCase();
  }

  function marketGroup(m=''){
    const v=String(m).toUpperCase();
    if(v.includes('BTTS')||v.includes('GG'))return 'BTTS';
    if(v.includes('OVER 2.5')||v.includes('O2.5'))return 'O2.5';
    if(v.includes('DRAW')||v==='X')return 'DRAW';
    if(v.includes('WIN'))return 'WIN';
    return 'OTHER';
  }

  function renderSignals(){
    const feed=$('#signalFeed');
    const rows=signals.filter(s=>activeFilter==='ALL'||marketGroup(s.market)===activeFilter);
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
      return `<article class="signal-card">
        <div class="signal-top">
          <div><div class="league">${s.league||''}</div><h4>${s.home} vs ${s.away}</h4></div>
          <span class="market-badge">${s.market}</span>
        </div>
        <div class="signal-meta">
          <span>${s.time||'—'} WAT</span>
          ${s.odds?`<span>Odds ${s.odds}</span>`:''}
          <span class="${gradeClass}">${grade}</span>
        </div>
        ${s.reason?`<p class="reason">${s.reason}</p>`:''}
      </article>`;
    }).join('');
  }

  function renderResults(){
    const won=results.filter(r=>r.status==='WON').length;
    const lost=results.filter(r=>r.status==='LOST').length;
    const voided=results.filter(r=>r.status==='VOID').length;
    const settled=won+lost;
    $('#wonCount').textContent=won;
    $('#lostCount').textContent=lost;
    $('#voidCount').textContent=voided;
    $('#strikeRate').textContent=settled?`${Math.round((won/settled)*100)}%`:'—';
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

  $('#refreshBtn')?.addEventListener('click',()=>renderSignals());
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
})();
