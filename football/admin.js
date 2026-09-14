(()=>{
  const URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
  const KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
  const sb=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const pretty=s=>String(s||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,m=>m.toUpperCase());

  let rows=[];
  let fixtures=[];
  let candidates=[];
  let editingId=null;
  let activeFixtureId=null;
  let managerFilter='ALL';
  let pipelineBusy=false;

  const fmt=value=>new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
  const slug=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const localToIso=value=>new Date(`${value}:00+01:00`).toISOString();
  const isoToLocal=value=>{
    const d=new Date(value);
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
    const get=t=>p.find(x=>x.type===t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  };
  const watDate=()=>{
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>p.find(x=>x.type===t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const dateRange=value=>{
    const start=new Date(`${value}T00:00:00+01:00`);
    return {start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()};
  };
  const msg=(text,kind='')=>{const el=$('#formMessage');if(!el)return;el.textContent=text||'';el.className='admin-message '+kind;};
  const syncMsg=(text,kind='')=>{const el=$('#syncMessage');if(!el)return;el.textContent=text||'';el.className='admin-message '+kind;};
  const setBusy=busy=>{
    pipelineBusy=busy;
    ['runFullPipeline','syncFixtures','enrichEvidence','selectMarkets','settleResults'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=busy;});
  };

  async function edgeError(error,fallback){
    let detail=error?.message||fallback;
    try{if(error?.context){const body=await error.context.json();detail=body?.error||body?.message||detail;}}catch{}
    return detail;
  }

  function filteredRows(){
    return rows.filter(r=>managerFilter==='ALL'||(managerFilter==='PUBLISHED'&&r.published)||(managerFilter==='DRAFT'&&!r.published)||(managerFilter==='PENDING'&&r.result_status==='PENDING')||(managerFilter==='SETTLED'&&r.result_status!=='PENDING'));
  }

  function render(){
    const list=$('#adminSignals');
    const data=filteredRows();
    if(!data.length){list.innerHTML='<div class="admin-empty">No signals in this view.</div>';return;}
    list.innerHTML=data.map(r=>{
      const ref=r.reference_odds!=null?`<span>Ref ${Number(r.reference_odds).toFixed(2)}</span>`:'';
      const score=r.model_score!=null?`<span>Engine ${Math.round(Number(r.model_score))}/100</span>`:'';
      const source=r.auto_generated?'<span>AUTO DRAFT</span>':'<span>MANUAL</span>';
      const result=r.result_score?`${r.result_status} ${r.result_score}`:r.result_status;
      return `<article class="admin-signal" data-id="${esc(r.id)}">
        <div class="admin-signal-top"><div><div class="sub">${esc(r.competition)}</div><h4>${esc(r.home_team)} vs ${esc(r.away_team)}</h4><div class="sub">${esc(fmt(r.kickoff_at))} WAT</div></div><span class="status ${r.published?'published':'draft'}">${r.published?'PUBLISHED':'DRAFT'}</span></div>
        <div class="admin-signal-meta"><span>${esc(r.market_group)}</span><span>${esc(r.selection)}</span>${r.odds!=null?`<span>Odds ${Number(r.odds).toFixed(2)}</span>`:''}${ref}<span>${esc(r.grade)}</span>${score}${source}<span>${esc(result)}</span></div>
        <div class="admin-actions">
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="publish">${r.published?'Unpublish':'Publish'}</button>
          <button type="button" class="win" data-result="WON">Won</button>
          <button type="button" class="loss" data-result="LOST">Lost</button>
          <button type="button" class="void" data-result="VOID">Void</button>
          <button type="button" data-result="PENDING">Pending</button>
          <button type="button" class="remove" data-action="remove">Remove</button>
        </div>
      </article>`;
    }).join('');
  }

  async function load(){
    const {data,error}=await sb.from('football_signals').select('*').order('kickoff_at',{ascending:false}).limit(150);
    if(error){$('#adminSignals').innerHTML=`<div class="admin-empty">Could not load signals: ${esc(error.message)}</div>`;return;}
    rows=data||[];render();
  }

  function renderPipeline(){
    const list=$('#fixtureList');
    if(!list)return;
    const map=new Map(candidates.map(c=>[c.fixture_id,c]));
    const enriched=candidates.filter(c=>c?.evidence?.stage==='evidence_enriched').length;
    const ready=candidates.filter(c=>String(c.decision).toUpperCase()==='READY').length;
    const drafts=candidates.filter(c=>String(c.decision).toUpperCase()==='DRAFT_READY').length;
    const rejected=candidates.filter(c=>String(c.decision).toUpperCase()==='REJECTED').length;
    $('#fixtureCount').textContent=fixtures.length;
    $('#enrichedCount').textContent=enriched;
    $('#readyCount').textContent=ready;
    $('#draftCount').textContent=drafts;
    $('#rejectedCount').textContent=rejected;
    if(!fixtures.length){list.innerHTML='<div class="admin-empty">No imported fixtures for this date yet.</div>';return;}

    list.innerHTML=fixtures.slice(0,120).map(f=>{
      const c=map.get(f.id);
      const decision=String(c?.decision||'NOT SCANNED').toUpperCase();
      const gaps=Array.isArray(c?.data_gaps)?c.data_gaps:[];
      const evidence=c?.evidence||{};
      const coverage=Number.isFinite(Number(evidence.coverage_score))?Math.round(Number(evidence.coverage_score)):null;
      const quality=String(evidence.quality_grade||f.data_quality||'BASIC').toUpperCase();
      const decisionClass=['READY','DRAFT_READY','PUBLISHED','SETTLED'].includes(decision)?'ready':decision==='WAIT'?'waiting':decision==='REJECTED'?'rejected':'';
      const gapPreview=gaps.slice(0,2).map(g=>`<span class="gap-tag">${esc(pretty(g))}</span>`).join('');
      const pick=c?.selection?`<div class="candidate-pick"><b>${esc(c.selection)}</b>${c.grade?` · ${esc(c.grade)}`:''}${c.score!=null?` · ${Math.round(Number(c.score))}/100`:''}</div>`:'';
      const ref=c?.market_context?.reference_odds?`<span>Ref ${Number(c.market_context.reference_odds).toFixed(2)}</span>`:'';
      return `<article class="fixture-row" data-fixture-id="${esc(f.id)}">
        <div class="fixture-main">
          <div class="sub">${esc(f.competition)}${f.country?` · ${esc(f.country)}`:''}</div>
          <h4>${esc(f.home_team)} vs ${esc(f.away_team)}</h4>
          <div class="sub">${esc(fmt(f.kickoff_at))} WAT · ${esc(f.status||'NS')}</div>
          ${pick}
          <div class="fixture-evidence">${coverage!=null?`<span>Coverage <b>${coverage}%</b></span>`:'<span>Coverage —</span>'}<span>Quality <b>${esc(quality)}</b></span>${ref}${gapPreview}</div>
        </div>
        <div class="fixture-side">
          <span class="fixture-decision ${decisionClass}">${esc(decision)}</span>
          <span class="gap-count">${gaps.length} gap${gaps.length===1?'':'s'}</span>
          <div class="fixture-buttons">
            <button type="button" class="small-action" data-enrich-fixture="${esc(f.id)}">Enrich</button>
            <button type="button" class="small-action" data-gate-fixture="${esc(f.id)}">Gate</button>
            <button type="button" class="small-action" data-use-fixture="${esc(f.id)}">Review</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  async function loadPipeline(){
    const date=$('#syncDate')?.value||watDate();
    const {start,end}=dateRange(date);
    const fixtureRes=await sb.from('football_fixtures')
      .select('id,provider,provider_fixture_id,competition,country,home_team,away_team,kickoff_at,status,data_quality,last_synced_at')
      .gte('kickoff_at',start).lt('kickoff_at',end).order('kickoff_at',{ascending:true}).limit(250);
    if(fixtureRes.error){fixtures=[];candidates=[];renderPipeline();syncMsg(`Could not load fixture pipeline: ${fixtureRes.error.message}`,'error');return;}
    fixtures=fixtureRes.data||[];
    if(!fixtures.length){candidates=[];renderPipeline();return;}
    const ids=fixtures.map(f=>f.id);
    const candidateRes=await sb.from('football_engine_candidates')
      .select('id,fixture_id,engine,market_group,selection,grade,confidence,score,decision,evidence,data_gaps,contradictions,signal_id,ranked_markets,market_context,model_version,updated_at')
      .in('fixture_id',ids).order('created_at',{ascending:false});
    candidates=candidateRes.error?[]:(candidateRes.data||[]);
    renderPipeline();
  }

  function resetForm(){
    editingId=null;activeFixtureId=null;$('#signalForm').reset();$('#published').checked=false;$('#editorTitle').textContent='New signal';$('#saveSignal').textContent='Save draft';$('#cancelEdit').hidden=true;msg('');
  }

  function editRow(r){
    editingId=r.id;activeFixtureId=r.fixture_id||null;
    $('#competition').value=r.competition||'';$('#homeTeam').value=r.home_team||'';$('#awayTeam').value=r.away_team||'';$('#kickoff').value=isoToLocal(r.kickoff_at);$('#marketGroup').value=r.market_group||'OTHER';$('#selection').value=r.selection||'';$('#odds').value=r.odds??'';$('#grade').value=r.grade||'STRONG CORE';$('#confidence').value=r.confidence??r.model_score??'';$('#rationale').value=r.rationale||'';$('#published').checked=!!r.published;
    $('#editorTitle').textContent=r.auto_generated?'Review engine draft':'Edit signal';$('#saveSignal').textContent=r.published?'Save published signal':'Save draft';$('#cancelEdit').hidden=false;document.querySelector('.editor-card')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function useFixture(f){
    const existing=rows.find(r=>r.fixture_id===f.id);
    if(existing){editRow(existing);msg('Existing signal/draft loaded for review.','info');return;}
    editingId=null;activeFixtureId=f.id;$('#signalForm').reset();
    $('#competition').value=f.competition||'';$('#homeTeam').value=f.home_team||'';$('#awayTeam').value=f.away_team||'';$('#kickoff').value=isoToLocal(f.kickoff_at);$('#marketGroup').value='OTHER';$('#selection').value='';$('#odds').value='';$('#grade').value='STRONG CORE';$('#confidence').value='';$('#rationale').value='';$('#published').checked=false;
    $('#editorTitle').textContent='Review imported fixture';$('#saveSignal').textContent='Save draft';$('#cancelEdit').hidden=false;msg('Fixture loaded. Do not publish unless the evidence and contradiction gates support the selection.','info');document.querySelector('.editor-card')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function sendPush(signalId){
    try{const {data,error}=await sb.functions.invoke('football-push-send',{body:{signal_id:signalId}});if(error)return {ok:false,error:await edgeError(error,'Push failed')};return data||{ok:true};}catch(e){return {ok:false,error:String(e)};}
  }

  async function runSync(date,{silent=false}={}){
    if(!silent)syncMsg('Importing worldwide fixtures. Nothing will be auto-published.');
    const {data,error}=await sb.functions.invoke('football-fixture-intake',{body:{date,max_pages:6}});
    if(error)throw new Error(await edgeError(error,'Fixture sync failed.'));
    if(!data?.ok)throw new Error(data?.error||'Fixture sync did not complete.');
    await loadPipeline();
    return data;
  }

  async function runEvidence(body,{silent=false}={}){
    if(!silent)syncMsg('Building evidence from recent matches. Missing provider data stays visible as a gap.');
    const {data,error}=await sb.functions.invoke('football-evidence-enrich',{body});
    if(error)throw new Error(await edgeError(error,'Evidence enrichment failed.'));
    if(!data?.ok)throw new Error(data?.error||'Evidence enrichment did not complete.');
    return data;
  }

  async function runMarketGate(body,{silent=false}={}){
    if(!silent)syncMsg('Comparing all supported markets and applying contradiction gates. Qualified picks remain drafts.');
    const {data,error}=await sb.functions.invoke('football-market-select',{body});
    if(error)throw new Error(await edgeError(error,'Market gate failed.'));
    if(!data?.ok)throw new Error(data?.error||'Market gate did not complete.');
    await Promise.all([load(),loadPipeline()]);
    return data;
  }

  async function runSettlement({silent=false}={}){
    if(!silent)syncMsg('Checking completed matches and settling supported signals…');
    const {data,error}=await sb.functions.invoke('football-result-settler',{body:{limit:100}});
    if(error)throw new Error(await edgeError(error,'Result settlement failed.'));
    if(!data?.ok)throw new Error(data?.error||'Settlement did not complete.');
    await load();
    return data;
  }

  async function pool(items,limit,worker,onProgress){
    let cursor=0,done=0;const jobs=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=cursor++;if(i>=items.length)return;await worker(items[i],i);done++;onProgress?.(done,items.length);}});await Promise.all(jobs);
  }

  $('#signalForm').addEventListener('submit',async e=>{
    e.preventDefault();msg('Saving…');const btn=$('#saveSignal');btn.disabled=true;
    const kickoff=$('#kickoff').value,home=$('#homeTeam').value.trim(),away=$('#awayTeam').value.trim(),publishing=$('#published').checked;
    const payload={fixture_id:activeFixtureId||null,competition:$('#competition').value.trim(),home_team:home,away_team:away,kickoff_at:localToIso(kickoff),market_group:$('#marketGroup').value,selection:$('#selection').value.trim(),odds:$('#odds').value?Number($('#odds').value):null,grade:$('#grade').value,confidence:$('#confidence').value?Number($('#confidence').value):null,rationale:$('#rationale').value.trim()||null,published:publishing,published_at:publishing?new Date().toISOString():null,fixture_key:`${kickoff.slice(0,10)}|${slug(home)}|${slug(away)}`};
    let q=editingId?sb.from('football_signals').update(payload).eq('id',editingId):sb.from('football_signals').insert(payload);
    q=q.select('id,published').single();const {data,error}=await q;btn.disabled=false;
    if(error){msg(error.message||'Could not save signal.','error');return;}
    let pushText='';if(data?.published){const p=await sendPush(data.id);pushText=p?.delivered?` Push sent to ${p.delivered} device${p.delivered===1?'':'s'}.`:'';}
    const wasEditing=!!editingId;resetForm();msg((wasEditing?'Signal updated.':'Signal created.')+pushText,'ok');await Promise.all([load(),loadPipeline()]);
  });

  $('#syncFixtures')?.addEventListener('click',async()=>{
    if(pipelineBusy)return;setBusy(true);const date=$('#syncDate').value||watDate();
    try{const d=await runSync(date);syncMsg(`${d.message} Seen ${d.fixtures_seen||0} · saved ${d.fixtures_written||0}.`,'ok');}catch(e){syncMsg(e.message||String(e),'error');}finally{setBusy(false);}
  });

  $('#enrichEvidence')?.addEventListener('click',async()=>{
    if(pipelineBusy)return;setBusy(true);const date=$('#syncDate').value||watDate();
    try{const d=await runEvidence({date,limit:20});syncMsg(`${d.message} Enriched ${d.enriched||0} · ready ${d.ready||0} · failed ${d.failed||0}.`,'ok');await loadPipeline();}catch(e){syncMsg(e.message||String(e),'error');}finally{setBusy(false);}
  });

  $('#selectMarkets')?.addEventListener('click',async()=>{
    if(pipelineBusy)return;setBusy(true);const date=$('#syncDate').value||watDate();
    try{const d=await runMarketGate({date});syncMsg(`${d.message} Qualified ${d.qualified||0} · drafts ${d.drafts||0} · rejected ${d.rejected||0}.`,'ok');}catch(e){syncMsg(e.message||String(e),'error');}finally{setBusy(false);}
  });

  $('#settleResults')?.addEventListener('click',async()=>{
    if(pipelineBusy)return;setBusy(true);
    try{const d=await runSettlement();syncMsg(`${d.message} Won ${d.won||0} · lost ${d.lost||0} · void ${d.voided||0} · skipped ${d.skipped||0}.`,'ok');}catch(e){syncMsg(e.message||String(e),'error');}finally{setBusy(false);}
  });

  $('#runFullPipeline')?.addEventListener('click',async()=>{
    if(pipelineBusy)return;setBusy(true);const btn=$('#runFullPipeline'),old=btn.textContent,date=$('#syncDate').value||watDate();btn.textContent='Running full pipeline…';
    try{
      syncMsg('Stage 1/3 — syncing worldwide fixtures…');const s=await runSync(date,{silent:true});
      const upcoming=fixtures.filter(f=>new Date(f.kickoff_at).getTime()>Date.now()).slice(0,40);
      if(!upcoming.length){syncMsg('Fixture sync completed but there are no upcoming fixtures to analyse.','info');return;}
      syncMsg(`Stage 2/3 — enriching ${upcoming.length} nearest upcoming fixture${upcoming.length===1?'':'s'}…`);
      let failures=0;await pool(upcoming,3,async f=>{try{await runEvidence({fixture_id:f.id,limit:1},{silent:true});}catch{failures++;}},(done,total)=>syncMsg(`Stage 2/3 — evidence ${done}/${total}${failures?` · ${failures} failed`:''}…`));
      await loadPipeline();syncMsg('Stage 3/3 — applying market selection and contradiction gates…');const g=await runMarketGate({date},{silent:true});
      syncMsg(`Full pipeline complete. Fixtures ${s.fixtures_written||0} · analysed ${upcoming.length-failures} · qualified ${g.qualified||0} · drafts ${g.drafts||0} · rejected ${g.rejected||0}. Nothing was auto-published.`,'ok');
    }catch(e){syncMsg(e.message||String(e),'error');}finally{btn.textContent=old;setBusy(false);}
  });

  $('#syncDate')?.addEventListener('change',()=>{syncMsg('');loadPipeline();});
  $('#fixtureList')?.addEventListener('click',async e=>{
    const enrich=e.target.closest('[data-enrich-fixture]');
    if(enrich){enrich.disabled=true;const old=enrich.textContent;enrich.textContent='…';try{const d=await runEvidence({fixture_id:enrich.dataset.enrichFixture,limit:1});syncMsg(d.message,'ok');await loadPipeline();}catch(err){syncMsg(err.message||String(err),'error');}finally{enrich.disabled=false;enrich.textContent=old;}return;}
    const gate=e.target.closest('[data-gate-fixture]');
    if(gate){gate.disabled=true;const old=gate.textContent;gate.textContent='…';try{const d=await runMarketGate({fixture_id:gate.dataset.gateFixture});syncMsg(d.message,'ok');}catch(err){syncMsg(err.message||String(err),'error');}finally{gate.disabled=false;gate.textContent=old;}return;}
    const id=e.target.closest('[data-use-fixture]')?.dataset.useFixture;if(!id)return;const f=fixtures.find(x=>x.id===id);if(f)useFixture(f);
  });

  $('#cancelEdit').addEventListener('click',resetForm);
  $('#reloadSignals').addEventListener('click',()=>Promise.all([load(),loadPipeline()]));
  $$('.manager-chip').forEach(btn=>btn.addEventListener('click',()=>{managerFilter=btn.dataset.managerFilter;$$('.manager-chip').forEach(b=>b.classList.toggle('active',b===btn));render();}));

  $('#adminSignals').addEventListener('click',async e=>{
    const card=e.target.closest('[data-id]');if(!card)return;const r=rows.find(x=>x.id===card.dataset.id);if(!r)return;
    if(e.target.dataset.action==='edit'){editRow(r);return;}
    if(e.target.dataset.action==='publish'){
      const next=!r.published;const {error}=await sb.from('football_signals').update({published:next,published_at:next?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',r.id);
      if(error){syncMsg(error.message,'error');return;}if(next){const p=await sendPush(r.id);syncMsg(p?.delivered?`Published. Push delivered to ${p.delivered} device${p.delivered===1?'':'s'}.`:'Published. No subscribed device received a push yet.','ok');}await load();return;
    }
    if(e.target.dataset.result){const status=e.target.dataset.result;const {error}=await sb.from('football_signals').update({result_status:status,settled_at:status==='PENDING'?null:new Date().toISOString(),result_source:status==='PENDING'?null:'manual',updated_at:new Date().toISOString()}).eq('id',r.id);if(!error)await load();return;}
    if(e.target.dataset.action==='remove'){if(!confirm(`Remove ${r.home_team} vs ${r.away_team}?`))return;const {error}=await sb.from('football_signals').delete().eq('id',r.id);if(!error)await Promise.all([load(),loadPipeline()]);}
  });

  (async()=>{
    const {data:{session}}=await sb.auth.getSession();if(!session){location.replace('login.html?next=admin.html');return;}
    const {data:admin,error}=await sb.from('football_admins').select('role').eq('user_id',session.user.id).maybeSingle();document.documentElement.classList.add('admin-ready');if(error||!admin){$('#accessDenied').hidden=false;return;}
    $('#adminRole').textContent=String(admin.role||'ADMIN').toUpperCase();$('#adminArea').hidden=false;$('#syncDate').value=watDate();resetForm();await Promise.all([load(),loadPipeline()]);
  })();
})();