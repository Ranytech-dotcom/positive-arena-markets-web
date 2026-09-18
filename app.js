const FEED='https://nsmevyhcpqijreuwbqkv.supabase.co/functions/v1/markets-feed';
const page=document.body.dataset.page;
let DATA=null;
let historyFilter='all';

const fmt=(v)=>{const n=Number(v);return Number.isFinite(n)?n.toFixed(2):'-'};
const wat=v=>v?new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(v))+' WAT':'-';
const dateKey=v=>{if(!v)return'unknown';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(v));const o={};parts.forEach(p=>o[p.type]=p.value);return `${o.year}-${o.month}-${o.day}`};
const isActive=s=>['WAITING','ACTIVE','TP1_HIT','TP2_HIT'].includes(String(s?.status||''));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const goldOnly=rows=>(rows||[]).filter(s=>String(s?.asset||'').toUpperCase()==='XAUUSD');

function row(s,expanded=false){
  const details=expanded?`<div class="signal-details"><div><span>ENTRY</span><b>${fmt(s.entryLow)} - ${fmt(s.entryHigh)}</b></div><div><span>SL</span><b>${fmt(s.sl)}</b></div><div><span>TP1</span><b>${fmt(s.tp1)}</b></div><div><span>TP2</span><b>${fmt(s.tp2)}</b></div><div><span>TP3</span><b>${fmt(s.tp3)}</b></div></div>`:'';
  return `<div class="row gold-row"><div><b>GOLD</b><small>XAUUSD · ${esc(wat(s.createdAt))}</small></div><div><strong class="${s.direction==='BUY'?'buy':'sell'}">${esc(s.direction)} · ${esc(s.pattern||'V6 SETUP')}</strong><small>${esc(s.primaryTimeframe||'')} · ${esc(s.status||'')} · ${esc(s.grade||'')}</small>${details}</div><div class="right"><b>${Number(s.quality||0)}/20</b><small>quality</small></div></div>`;
}

function renderHero(s,w){
  const e=document.getElementById('hero');if(!e)return;
  if(s&&String(s.asset||'').toUpperCase()==='XAUUSD'){
    const pr=s.portfolioRisk||{};
    e.className='card signal-card verified-signal';
    e.innerHTML=`<div class="ey">CURRENT GOLD SIGNAL</div><div class="hero"><div><h1>XAUUSD</h1><small>${esc(s.status)} · ${esc(s.grade)} · ${esc(wat(s.createdAt))}</small></div><strong class="direction-badge ${s.direction==='BUY'?'buy':'sell'}">${esc(s.direction)}</strong></div><p>${esc(s.pattern||'V6 SETUP')} · ${esc(s.primaryTimeframe||'')} · Quality ${Number(s.quality||0)}/20</p><div class="levels"><div><span>ENTRY ZONE</span><b>${fmt(s.entryLow)} - ${fmt(s.entryHigh)}</b></div><div><span>STOP LOSS</span><b>${fmt(s.sl)}</b></div><div><span>TP1</span><b>${fmt(s.tp1)}</b></div><div><span>TP2</span><b>${fmt(s.tp2)}</b></div><div><span>TP3</span><b>${fmt(s.tp3)}</b></div></div><p>Risk status: <b>${esc(pr.correlationLevel||'NORMAL')}</b>${pr.recommendedMaxRiskPct==null?'':' · Suggested max risk '+Number(pr.recommendedMaxRiskPct).toFixed(2)+'%'}</p>`;
    return;
  }
  if(w&&w.stage!=='CANCELLED'){
    const prepare=w.stage==='PREPARE',dir=String(w.direction||'').toUpperCase();
    e.className='card signal-card setup-watch-card';
    e.innerHTML=`<div class="ey">LIVE GOLD WATCH</div><div class="hero"><div><h1>XAUUSD ${esc(dir)} BIAS</h1><small>${prepare?'Pullback found · professional gates running':'Strong direction detected · safer entry pending'} · ${esc(wat(w.updatedAt))}</small></div><strong class="direction-badge watch-badge ${dir==='BUY'?'buy':'sell'}">${prepare?'PREPARE':'BUILDING'}</strong></div><div class="watch-instruction">${esc(w.instruction||'WAIT — DO NOT ENTER')}</div><div class="watch-grid"><div><span>CURRENT GOLD</span><b>${fmt(w.currentPrice)}</b></div><div><span>STRUCTURAL RISK</span><b>${w.currentStopAtr==null?'-':Number(w.currentStopAtr).toFixed(2)+' ATR'}</b></div><div><span>M15 / H1 / H4</span><b>${esc(w.timeframes?.m15||'-')} / ${esc(w.timeframes?.h1||'-')} / ${esc(w.timeframes?.h4||'-')}</b></div><div><span>TECHNICAL SCORE</span><b>${w.technicalScore==null?'-':esc(w.technicalScore)+'/9'}</b></div></div><p class="watch-reason">${esc(w.blocker||'Waiting for pullback and confirmation.')}</p><p class="small"><b>Early warning only.</b> Entry, SL and targets will appear only after the M15 confirmation, M5 execution and final safety gates pass.</p>`;
    return;
  }
  e.className='card signal-card';
  const cancelled=w&&w.stage==='CANCELLED';
  e.innerHTML=`<div class="ey">CURRENT GOLD SIGNAL</div><div class="empty"><b>${cancelled?'Previous setup cancelled.':'No active Gold setup right now.'}</b><br><span>${cancelled?esc(w.blocker||'Directional conditions changed. Wait for a new setup.'):'The 5-minute discovery engine is monitoring XAUUSD. It will show strong bias early, but entry is released only after the full confirmation chain passes.'}</span></div>`;
}

function renderJourney(d){
  const e=document.getElementById('signalJourney');if(!e)return;
  const steps=['LIVE BIAS','SETUP BUILDING','PRE-CONFIRMATION','M15 CONFIRMED','M5 RETEST','ENTRY READY','ACTIVE'];
  let index=-1,label='SCANNING',cancelled=d.watch?.stage==='CANCELLED';
  if(d.watch?.stage==='SETUP_BUILDING'){index=1;label='WAIT FOR PULLBACK'}
  if(d.watch?.stage==='PREPARE'){index=2;label='PREPARE — NO ENTRY YET'}
  const s=d.active,p=s?.preEntry||{},stage=String(p.stage||'');
  if(s){index=2;label='PROFESSIONAL GATES RUNNING';if(/M15_CONFIRMED|CONFIRMED_WAIT|ENTRY_READY/.test(stage))index=3;if(/RETEST/.test(stage))index=4;if(p.entryGatePass===true||stage==='ENTRY_READY')index=5;if(['ACTIVE','TP1_HIT','TP2_HIT'].includes(String(s.status))){index=6;label=String(s.status).replaceAll('_',' ')}}
  if(cancelled){index=-1;label='SETUP CANCELLED — WAIT FOR NEW BIAS'}
  e.innerHTML=`<div class="journey-head"><div><div class="ey">LIVE SIGNAL PATH</div><b>${esc(label)}</b></div><span class="journey-live">${cancelled?'CANCELLED':'AUTO-REFRESH 30s'}</span></div><div class="journey-steps">${steps.map((x,i)=>`<div class="journey-step ${i<index?'done':i===index?'current':''}"><span>${i+1}</span><small>${x}</small></div>`).join('')}</div>`;
}

function renderMacro(d){const e=document.getElementById('macro');if(!e)return;const m=d.macro||{},n=d.nextMacroEvent;const cls=m.state==='VERIFIED'?'healthy':m.state==='STALE'||m.state==='UNAVAILABLE'?'danger':'warning';e.innerHTML=`<div class="${cls}"><b>${esc(m.state||'-')}</b></div><div class="small">Calendar source: ${esc(m.source||'-')}<br>Updated: ${esc(wat(m.fetchedAt))}<br>${Number(m.highImpactCount||0)} high-impact event${Number(m.highImpactCount||0)===1?'':'s'} tracked</div>${n?`<div class="small info-line"><b>Next:</b> ${esc(n.country)} · ${esc(n.title)}<br>${Number(n.minutesAway||0)} min · ${esc(wat(n.date))}</div>`:''}`}

function renderRisk(d){const e=document.getElementById('risk');if(!e)return;const r=d.riskPolicy||{},open=goldOnly(r.openExposures||[]);e.innerHTML=`<div class="small">Base risk / trade: <b>${Number(r.riskPerTradePct||0).toFixed(2)}%</b><br>Total open cap: <b>${Number(r.maxTotalOpenRiskPct||0).toFixed(2)}%</b><br>Open Gold signals: <b>${open.length}</b></div>`}

function renderHistory(){const e=document.getElementById('history');if(!e||!DATA)return;let rows=goldOnly(DATA.recent);if(historyFilter==='buy')rows=rows.filter(s=>s.direction==='BUY');if(historyFilter==='sell')rows=rows.filter(s=>s.direction==='SELL');if(historyFilter==='active')rows=rows.filter(isActive);if(historyFilter==='closed')rows=rows.filter(s=>!isActive(s));e.innerHTML=rows.length?rows.map(s=>row(s,true)).join(''):'<div class="card empty">No Gold signals match this filter.</div>'}

function renderCalendar(){const rows=goldOnly(DATA?.recent),groups={};for(const s of rows){const d=dateKey(s.createdAt);(groups[d]??=[]).push(s)}const days=Object.keys(groups).sort().reverse(),cal=document.getElementById('calendar'),list=document.getElementById('calendarList');if(!cal||!list)return;if(!days.length){cal.innerHTML='<div class="empty">No dated Gold signals yet.</div>';list.innerHTML='';return}cal.innerHTML=days.slice(0,28).map((d,i)=>`<button class="day ${i===0?'selected':''}" data-date="${esc(d)}"><b>${esc(d.slice(8))}</b><small>${groups[d].length} Gold signal${groups[d].length===1?'':'s'}</small></button>`).join('');const show=d=>{list.innerHTML=`<div class="head"><h2>${esc(d)}</h2></div>`+groups[d].map(s=>row(s,true)).join('');cal.querySelectorAll('.day').forEach(b=>b.classList.toggle('selected',b.dataset.date===d))};cal.querySelectorAll('.day').forEach(b=>b.addEventListener('click',()=>show(b.dataset.date)));show(days[0])}

function renderSettings(d){const set=(id,v)=>{const e=document.getElementById(id);if(!e)return;e.textContent=v?'ON':'OFF';e.className=v?'on':'off'};set('tg',d.delivery?.telegram);set('email',d.delivery?.email);set('push',d.delivery?.push);const sys=document.getElementById('system');if(sys)sys.innerHTML=`Asset: <b>Gold (XAUUSD) only</b><br>Session: <b>${esc(d.sessionLabel||'-')}</b><br>Gold status: <b>${esc(String(d.marketStatus||'-').replaceAll('_',' '))}</b><br>Engine: <b>${d.engineEnabled===false?'PAUSED':'ON'}</b><br>Macro protection: <b>${esc(d.macro?.state||'-')}</b>`;const r=d.riskPolicy||{},risk=document.getElementById('settingsRisk');if(risk)risk.innerHTML=`Risk / trade: <b>${Number(r.riskPerTradePct||0).toFixed(2)}%</b><br>Total open cap: <b>${Number(r.maxTotalOpenRiskPct||0).toFixed(2)}%</b><br>This test dashboard is restricted to XAUUSD.`}

function setBadges(d){const live=document.getElementById('liveBadge'),session=document.getElementById('sessionBadge'),market=document.getElementById('marketBadge');if(live){live.textContent='LIVE · '+wat(d.updatedAt);live.classList.add('healthy')}if(session)session.textContent=d.sessionLabel||'SESSION —';if(market)market.textContent='XAUUSD GOLD'}

async function load(){const status=document.getElementById('status'),refresh=document.getElementById('refresh');if(refresh){refresh.disabled=true;refresh.textContent='Refreshing…'}try{const r=await fetch(FEED+'?t='+Date.now(),{cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Feed unavailable');DATA=d;setBadges(d);if(page==='markets'){renderHero(d.active,d.watch);renderJourney(d);renderMacro(d);renderRisk(d);const e=document.getElementById('recent');const rows=goldOnly(d.recent);if(e)e.innerHTML=rows.length?rows.map(s=>row(s,false)).join(''):'<div class="card empty">No verified Gold signals yet.</div>'}if(page==='history')renderHistory();if(page==='calendar')renderCalendar();if(page==='settings')renderSettings(d);if(status)status.textContent='Gold V6 updated '+wat(d.updatedAt)}catch(e){if(status)status.textContent='Connection issue: '+(e.message||e);const live=document.getElementById('liveBadge');if(live){live.textContent='CONNECTION ISSUE';live.classList.add('danger')}}finally{if(refresh){refresh.disabled=false;refresh.textContent='Refresh'}}}

document.getElementById('refresh')?.addEventListener('click',load);
document.querySelectorAll('#historyFilters .filter').forEach(btn=>btn.addEventListener('click',()=>{historyFilter=btn.dataset.filter||'all';document.querySelectorAll('#historyFilters .filter').forEach(b=>b.classList.toggle('active',b===btn));renderHistory()}));
load();setInterval(load,30000);
