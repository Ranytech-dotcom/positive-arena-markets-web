(()=>{
  const pickClass=(value='')=>{
    const t=String(value).toUpperCase();
    if((t.includes('BTTS')||t.includes('GG'))&&t.includes('YES'))return 'pick-btts';
    if(t.includes('UNDER 2.5')||t.includes('U2.5'))return 'pick-under';
    if(t.includes('OVER 2.5')||t.includes('O2.5')||t.includes('OVER 1.5'))return 'pick-over';
    if(t==='DRAW'||t.includes('FULL-TIME X'))return 'pick-draw';
    if(t.includes('HOME WIN')||t.includes('AWAY WIN')||t==='WIN')return 'pick-win';
    if(t.includes('DOUBLE CHANCE')||t.includes('DRAW NO BET')||t.includes('DNB')||t.includes('(1X)')||t.includes('(X2)'))return 'pick-protect';
    if(t.includes('TEAM OVER')||t.includes('TEAM GOAL'))return 'pick-team';
    return 'pick-other';
  };

  const shortMarket=(selection,current='')=>{
    const t=String(selection||'').toUpperCase();
    if(t.includes('BTTS')||t.includes('GG'))return 'BTTS';
    if(t.includes('UNDER 2.5'))return 'U2.5';
    if(t.includes('OVER 2.5'))return 'O2.5';
    if(t.includes('OVER 1.5')&&!t.includes('TEAM'))return 'O1.5';
    if(t.includes('TEAM OVER'))return 'TEAM GOALS';
    if(t==='DRAW'||t.includes('FULL-TIME X'))return 'DRAW';
    if(t.includes('HOME WIN')||t.includes('AWAY WIN'))return 'WIN';
    if(t.includes('DOUBLE CHANCE')||t.includes('(1X)')||t.includes('(X2)'))return 'DOUBLE CHANCE';
    if(t.includes('DRAW NO BET')||t.includes('DNB'))return 'DNB';
    return String(current||'OTHER').toUpperCase();
  };

  function polishAdmin(){
    document.querySelectorAll('#adminSignals .admin-signal').forEach(card=>{
      const meta=[...card.querySelectorAll('.admin-signal-meta span')];
      if(meta.length<2)return;
      const selection=meta[1]?.textContent?.trim()||'';
      if(meta[0]){
        meta[0].textContent=shortMarket(selection,meta[0].textContent);
        meta[0].classList.add('market-type-pill');
      }
      if(meta[1]){
        meta[1].classList.add('prediction-pill',pickClass(selection));
      }
      meta.forEach(span=>{
        const text=span.textContent.trim();
        if(/^Engine\s+\d+\/100/i.test(text))span.textContent=text.replace(/^Engine/i,'Model score');
        if(text==='AUTO'||text==='MANUAL'||text==='PENDING')span.classList.add('meta-muted');
      });
      const status=card.querySelector('.status')?.textContent?.trim().toUpperCase();
      let note=card.querySelector('.hold-reason');
      if(status==='HELD'){
        const hasRef=meta.some(span=>/^Ref\s+/i.test(span.textContent.trim()));
        if(!note){note=document.createElement('div');note.className='hold-reason';card.querySelector('.admin-signal-meta')?.after(note);}
        note.textContent=hasRef?'HELD — Final release checks pending':'HELD — Final market confirmation missing';
      }else if(note){note.remove();}
    });
  }

  function polishMember(){
    document.querySelectorAll('#signalFeed .signal-card').forEach(card=>{
      const badge=card.querySelector('.market-badge');
      if(badge)badge.classList.add('prediction-pill',pickClass(badge.textContent));
      card.querySelectorAll('.signal-meta span').forEach(span=>{
        const text=span.textContent.trim();
        if(/^Engine\s+\d+\/100/i.test(text))span.textContent=text.replace(/^Engine/i,'Model score');
      });
    });
    document.querySelectorAll('#resultList .signal-card').forEach(card=>{
      const first=card.querySelector('.signal-meta span');
      if(first)first.classList.add('prediction-pill',pickClass(first.textContent));
    });
  }

  const polish=()=>{polishAdmin();polishMember();};
  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish();});
  });
  document.addEventListener('DOMContentLoaded',()=>{
    polish();
    observer.observe(document.body,{childList:true,subtree:true});
  });
})();