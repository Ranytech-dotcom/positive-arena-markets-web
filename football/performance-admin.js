(()=>{
  const URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
  const KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
  const sb=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function render(data){
    const overall=data?.overall||{};
    const settled=Number(overall.settled||0);
    const target=Number(overall.learning_target||30);
    const mode=String(data?.mode||'LEARNING').toUpperCase();
    const modeEl=$('#perfMode');
    if(modeEl)modeEl.textContent=mode;
    if($('#perfSettled'))$('#perfSettled').textContent=settled;
    if($('#perfWon'))$('#perfWon').textContent=Number(overall.won||0);
    if($('#perfLost'))$('#perfLost').textContent=Number(overall.lost||0);
    if($('#perfRate'))$('#perfRate').textContent=overall.strike_rate==null?'—':`${Number(overall.strike_rate).toFixed(1)}%`;

    const note=$('#perfLearningNote');
    if(note){
      if(settled<target)note.textContent=`Learning mode • ${settled}/${target} settled Core decisions collected. No engine rules will change automatically.`;
      else note.textContent='Observation mode • enough overall history is available for pattern review. Rule changes still require a manual decision.';
    }

    const box=$('#perfFlags');
    if(!box)return;
    const segments=Array.isArray(data?.segments)?data.segments:[];
    const qualified=segments
      .filter(s=>Number(s.sample_size||0)>=Number(data?.minimum_segment_sample||10))
      .filter(s=>['OUTPERFORMING','WATCH'].includes(String(s.status||'').toUpperCase()))
      .sort((a,b)=>Number(b.sample_size||0)-Number(a.sample_size||0))
      .slice(0,6);

    if(!qualified.length){
      const closest=segments
        .filter(s=>['MARKET','GRADE','SCORE_BAND','EVIDENCE_BAND','RELEASE_TIME'].includes(String(s.dimension||'')))
        .sort((a,b)=>Number(b.sample_size||0)-Number(a.sample_size||0))[0];
      const extra=closest?` Closest segment: ${closest.segment} (${closest.sample_size}/${data?.minimum_segment_sample||10}).`:'';
      box.innerHTML=`<div class="perf-calm">No strong or weak pattern is being declared yet.${esc(extra)}</div>`;
      return;
    }

    box.innerHTML=qualified.map(s=>{
      const status=String(s.status||'').toUpperCase();
      const rate=s.strike_rate==null?'—':`${Number(s.strike_rate).toFixed(1)}%`;
      return `<div class="perf-flag ${status==='WATCH'?'watch':'good'}"><div><b>${esc(s.segment)}</b><span>${esc(s.dimension.replaceAll('_',' '))} · ${Number(s.sample_size||0)} settled</span></div><strong>${esc(status==='WATCH'?'REVIEW':'STRONG')}</strong><small>${esc(rate)}</small></div>`;
    }).join('');
  }

  async function loadPerformance(){
    const box=$('#perfFlags');
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session)return;
      const {data,error}=await sb.rpc('get_football_performance_intelligence');
      if(error)throw error;
      render(data||{});
    }catch(err){
      if(box)box.innerHTML='<div class="perf-calm">Performance intelligence is temporarily unavailable.</div>';
    }
  }

  function boot(){
    loadPerformance();
    $('#reloadPerformance')?.addEventListener('click',loadPerformance);
    setInterval(loadPerformance,60000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
