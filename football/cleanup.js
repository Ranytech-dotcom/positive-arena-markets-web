(()=>{
  const TZ='Africa/Lagos';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  function watDateKey(){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  }

  function cleanReason(text=''){
    let t=String(text||'')
      .replace(/\s*Engine score\s*\d+(?:\.\d+)?\s*\/\s*100\.?/gi,'')
      .replace(/\s*Qualification score\s*\d+(?:\.\d+)?\s*\/\s*100\s*\(not win probability\)\.?/gi,'')
      .replace(/\s*No forced selection\.?/gi,'')
      .replace(/\s+([.,;:])/g,'$1')
      .replace(/\.{2,}/g,'.')
      .replace(/\s{2,}/g,' ')
      .trim();
    if(t&&/^[a-z]/.test(t))t=t.charAt(0).toUpperCase()+t.slice(1);
    return t;
  }

  function parseWatTime(text=''){
    const m=String(text).trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)\s*WAT$/i);
    if(!m)return null;
    let h=Number(m[1]);
    const min=Number(m[2]);
    const ap=m[3].toLowerCase();
    if(ap==='pm'&&h!==12)h+=12;
    if(ap==='am'&&h===12)h=0;
    return new Date(`${watDateKey()}T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:00+01:00`);
  }

  function countdownText(date){
    if(!(date instanceof Date)||Number.isNaN(date.getTime()))return '';
    const diff=date.getTime()-Date.now();
    if(diff<=0)return '';
    const mins=Math.max(1,Math.ceil(diff/60000));
    if(mins<60)return `Starts in ${mins} min`;
    const h=Math.floor(mins/60),m=mins%60;
    return `Starts in ${h}h${m?` ${m}m`:''}`;
  }

  function removeRedundantMarketChip(card,meta){
    const selection=String(card.querySelector('.market-badge')?.textContent||'').toUpperCase();
    if(!selection.includes('OVER 2.5'))return;
    Array.from(meta.querySelectorAll('span')).forEach(span=>{
      if(String(span.textContent||'').trim().toUpperCase()==='O2.5')span.remove();
    });
  }

  function clarifyScore(meta){
    Array.from(meta.querySelectorAll('span')).forEach(span=>{
      const text=String(span.textContent||'').trim();
      if(/^Model score\s+/i.test(text))span.textContent=text.replace(/^Model score/i,'Qualification score');
      else if(/^Engine\s+\d+(?:\.\d+)?\s*\/\s*100$/i.test(text))span.textContent=text.replace(/^Engine/i,'Qualification score');
    });
  }

  function polishCard(card){
    if(!card)return;
    const reason=card.querySelector('.reason');
    if(reason){
      const cleaned=cleanReason(reason.textContent);
      if(!cleaned){reason.remove();}
      else if(reason.textContent!==cleaned){reason.textContent=cleaned;}
    }

    const meta=card.querySelector('.signal-meta');
    if(!meta)return;
    removeRedundantMarketChip(card,meta);
    clarifyScore(meta);
    const timeSpan=Array.from(meta.querySelectorAll('span')).find(s=>/^\s*\d{1,2}:\d{2}\s*(am|pm)\s*WAT\s*$/i.test(s.textContent||''));
    if(!timeSpan)return;
    const label=countdownText(parseWatTime(timeSpan.textContent||''));
    let countdown=meta.querySelector('.kickoff-countdown');
    if(!label){if(countdown)countdown.remove();return;}
    if(!countdown){
      countdown=document.createElement('span');
      countdown.className='kickoff-countdown';
      timeSpan.insertAdjacentElement('afterend',countdown);
    }
    if(countdown.textContent!==label)countdown.textContent=label;
  }

  function polishAll(){
    $$('#signalFeed .signal-card, #watchlistFeed .signal-card').forEach(polishCard);
  }

  function addStyles(){
    if($('#footballCleanupStyles'))return;
    const style=document.createElement('style');
    style.id='footballCleanupStyles';
    style.textContent=`
      .kickoff-countdown{color:#63f2a6!important;border-color:rgba(99,242,166,.24)!important;background:rgba(57,229,140,.07)!important;font-weight:900!important}
      .signal-card .reason{line-height:1.55}
      @media(max-width:520px){.kickoff-countdown{font-size:10.5px!important}}
    `;
    document.head.appendChild(style);
  }

  function boot(){
    addStyles();
    polishAll();
    setTimeout(polishAll,600);
    setTimeout(polishAll,1800);
    document.querySelector('#refreshBtn')?.addEventListener('click',()=>setTimeout(polishAll,1200));
    setInterval(polishAll,15000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
