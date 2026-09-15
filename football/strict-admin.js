(()=>{
  const URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
  const KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
  const sb=window.supabase?.createClient?.(URL,KEY);
  if(!sb)return;

  function applyState(cfg){
    const paused=cfg?.auto_release_enabled!==true;
    const pill=Array.from(document.querySelectorAll('.pipeline-pill')).find(el=>/AUTO RELEASE/i.test(el.textContent||''));
    if(pill){
      pill.textContent=paused?'AUTO RELEASE PAUSED':'AUTO RELEASE ON';
      if(paused){
        pill.style.color='var(--gold)';
        pill.style.borderColor='rgba(243,200,104,.35)';
        pill.style.background='rgba(243,200,104,.08)';
      }
    }
    const card=document.querySelector('.pipeline-card');
    if(card&&!card.querySelector('[data-strict-pause-note]')){
      const note=document.createElement('div');
      note.dataset.strictPauseNote='1';
      note.className='admin-message info';
      note.style.marginTop='12px';
      note.textContent=paused
        ? 'Strict V2 validation is active. Scans may create HELD candidates, but automatic Core publishing is paused.'
        : `Strict engine active • ${cfg?.model_version||'FULL_PRO_V2_STRICT'}`;
      card.appendChild(note);
    }
  }

  async function load(){
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session)return;
      const {data,error}=await sb.from('football_runtime_config').select('auto_release_enabled,strict_mode,model_version,note').eq('key','core').maybeSingle();
      if(!error&&data)applyState(data);
    }catch{}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,300));
  else setTimeout(load,300);
})();
