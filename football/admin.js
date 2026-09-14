(()=>{
  const URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
  const KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
  const sb=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let rows=[];
  let fixtures=[];
  let candidates=[];
  let editingId=null;
  let managerFilter='ALL';

  const fmt=value=>new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
  const slug=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const pretty=s=>String(s||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,m=>m.toUpperCase());
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
  const msg=(text,kind='')=>{const el=$('#formMessage');el.textContent=text||'';el.className='admin-message '+kind;};
  const syncMsg=(text,kind='')=>{const el=$('#syncMessage');if(!el)return;el.textContent=text||'';el.className='admin-message '+kind;};

  function filteredRows(){
    return rows.filter(r=>managerFilter==='ALL'||(managerFilter==='PUBLISHED'&&r.published)||(managerFilter==='DRAFT'&&!r.published)||(managerFilter==='PENDING'&&r.result_status==='PENDING')||(managerFilter==='SETTLED'&&r.result_status!=='PENDING'));
  }

  function render(){
    const list=$('#adminSignals');
    const data=filteredRows();
    if(!data.length){list.innerHTML='<div class="admin-empty">No signals in this view.</div>';return;}
    list.innerHTML=data.map(r=>`<article class="admin-signal" data-id="${esc(r.id)}">
      <div class="admin-signal-top"><div><div class="sub">${esc(r.competition)}</div><h4>${esc(r.home_team)} vs ${esc(r.away_team)}</h4><div class="sub">${esc(fmt(r.kickoff_at))} WAT</div></div><span class="status ${r.published?'published':'draft'}">${r.published?'PUBLISHED':'DRAFT'}</span></div>
      <div class="admin-signal-meta"><span>${esc(r.market_group)}</span><span>${esc(r.selection)}</span>${r.odds!=null?`<span>Odds ${Number(r.odds).toFixed(2)}</span>`:''}<span>${esc(r.grade)}</span><span>${esc(r.result_status)}</span></div>
      <div class="admin-actions">
        <button type="button" data-action="edit">Edit</button>
        <button type="button" data-action="publish">${r.published?'Unpublish':'Publish'}</button>
        <button type="button" class="win" data-result="WON">Won</button>
        <button type="button" class="loss" data-result="LOST">Lost</button>
        <button type="button" class="void" data-result="VOID">Void</button>
        <button type="button" data-result="PENDING">Pending</button>
        <button type="button" class="remove" data-action="remove">Remove</button>
      </div>
    </article>`).join('');
  }

  async function load(){
    const {data,error}=await sb.from('football_signals').select('*').order('kickoff_at',{ascending:false}).limit(100);
    if(error){$('#adminSignals').innerHTML=`<div class="admin-empty">Could not load signals: ${esc(error.message)}</div>`;return;}
    rows=data||[];render();
  }

  function renderPipeline(){
    const list=$('#fixtureList');
    if(!list)return;
    const map=new Map(candidates.map(c=>[c.fixture_id,c]));
    const waiting=candidates.filter(c=>String(c.decision).toUpperCase()==='WAIT').length;
    const ready=candidates.filter(c=>String(c.decision).toUpperCase()==='READY').length;
    const enriched=candidates.filter(c=>c?.evidence?.stage==='evidence_enriched').length;
    $('#fixtureCount').textContent=fixtures.length;
    $('#waitingCount').textContent=waiting;
    $('#readyCount').textContent=ready;
    $('#enrichedCount').textContent=enriched;
    if(!fixtures.length){list.innerHTML='<div class="admin-empty">No imported fixtures for this date yet.</div>';return;}
    list.innerHTML=fixtures.slice(0,80).map(f=>{
      const c=map.get(f.id);
      const decision=String(c?.decision||'NOT SCANNED').toUpperCase();
      const gaps=Array.isArray(c?.data_gaps)?c.data_gaps:[];
      const evidence=c?.evidence||{};
      const coverage=Number.isFinite(Number(evidence.coverage_score))?Math.round(Number(evidence.coverage_score)):Number.isFinite(Number(c?.score))?Math.round(Number(c.score)):null;
      const quality=String(evidence.quality_grade||f.data_quality||'BASIC').toUpperCase();
      const decisionClass=decision==='READY'?'ready':decision==='WAIT'?'waiting':'';
      const gapPreview=gaps.slice(0,3).map(g=>`<span class="gap-tag">${esc(pretty(g))}</span>`).join('');
      return `<article class="fixture-row" data-fixture-id="${esc(f.id)}">
        <div class="fixture-main">
          <div class="sub">${esc(f.competition)}${f.country?` · ${esc(f.country)}`:''}</div>
          <h4>${esc(f.home_team)} vs ${esc(f.away_team)}</h4>
          <div class="sub">${esc(fmt(f.kickoff_at))} WAT · ${esc(f.status||'NS')}</div>
          <div class="fixture-evidence">${coverage!=null?`<span>Coverage <b>${coverage}%</b></span>`:'<span>Coverage —</span>'}<span>Quality <b>${esc(quality)}</b></span>${gapPreview}</div>
        </div>
        <div class="fixture-side">
          <span class="fixture-decision ${decisionClass}">${esc(decision)}</span>
          <span class="gap-count">${gaps.length} data gap${gaps.length===1?'':'s'}</span>
          <div class="fixture-buttons">
            <button type="button" class="small-action" data-enrich-fixture="${esc(f.id)}">Enrich</button>
            <button type="button" class="small-action" data-use-fixture="${esc(f.id)}">Use fixture</button>
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
      .gte('kickoff_at',start).lt('kickoff_at',end).order('kickoff_at',{ascending:true}).limit(200);
    if(fixtureRes.error){
      fixtures=[];candidates=[];renderPipeline();
      syncMsg(`Could not load fixture pipeline: ${fixtureRes.error.message}`,'error');
      return;
    }
    fixtures=fixtureRes.data||[];
    if(!fixtures.length){candidates=[];renderPipeline();return;}
    const ids=fixtures.map(f=>f.id);
    const candidateRes=await sb.from('football_engine_candidates')
      .select('id,fixture_id,engine,market_group,selection,grade,confidence,score,decision,evidence,data_gaps,contradictions,signal_id,updated_at')
      .in('fixture_id',ids).order('created_at',{ascending:false});
    candidates=candidateRes.error?[]:(candidateRes.data||[]);
    renderPipeline();
  }

  function resetForm(){
    editingId=null;$('#signalForm').reset();$('#published').checked=true;$('#editorTitle').textContent='New signal';$('#saveSignal').textContent='Publish signal';$('#cancelEdit').hidden=true;msg('');
  }

  function useFixture(f){
    editingId=null;
    $('#signalForm').reset();
    $('#competition').value=f.competition||'';
    $('#homeTeam').value=f.home_team||'';
    $('#awayTeam').value=f.away_team||'';
    $('#kickoff').value=isoToLocal(f.kickoff_at);
    $('#marketGroup').value='OTHER';
    $('#selection').value='';
    $('#odds').value='';
    $('#grade').value='STRONG CORE';
    $('#confidence').value='';
    $('#rationale').value='';
    $('#published').checked=false;
    $('#editorTitle').textContent='Review imported fixture';
    $('#saveSignal').textContent='Save as draft';
    $('#cancelEdit').hidden=false;
    msg('Fixture details loaded. Select a market only after the evidence and contradiction gates pass.','info');
    document.querySelector('.editor-card')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function editRow(r){
    editingId=r.id;
    $('#competition').value=r.competition||'';$('#homeTeam').value=r.home_team||'';$('#awayTeam').value=r.away_team||'';$('#kickoff').value=isoToLocal(r.kickoff_at);$('#marketGroup').value=r.market_group;$('#selection').value=r.selection||'';$('#odds').value=r.odds??'';$('#grade').value=r.grade;$('#confidence').value=r.confidence??'';$('#rationale').value=r.rationale||'';$('#published').checked=!!r.published;
    $('#editorTitle').textContent='Edit signal';$('#saveSignal').textContent='Save changes';$('#cancelEdit').hidden=false;document.querySelector('.editor-card')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function edgeError(error,fallback){
    let detail=error?.message||fallback;
    try{if(error?.context){const body=await error.context.json();detail=body?.error||body?.message||detail;}}catch{}
    return detail;
  }

  async function enrichEvidence(body,button){
    const old=button?.textContent;
    if(button){button.disabled=true;button.textContent='Enriching…';}
    syncMsg('Building evidence from recent matches. Missing provider data will remain a visible gap; nothing will be published.');
    const {data,error}=await sb.functions.invoke('football-evidence-enrich',{body});
    if(button){button.disabled=false;button.textContent=old;}
    if(error){syncMsg(await edgeError(error,'Evidence enrichment failed.'),'error');return false;}
    if(!data?.ok){syncMsg(data?.error||'Evidence enrichment did not complete.','error');return false;}
    syncMsg(`${data.message||'Evidence enrichment complete'} Selected ${data.fixtures_selected||0} · enriched ${data.enriched||0} · ready ${data.ready||0} · failed ${data.failed||0}.`,'ok');
    await loadPipeline();
    return true;
  }

  $('#signalForm').addEventListener('submit',async e=>{
    e.preventDefault();msg('Saving…');const btn=$('#saveSignal');btn.disabled=true;
    const kickoff=$('#kickoff').value;
    const home=$('#homeTeam').value.trim(),away=$('#awayTeam').value.trim();
    const payload={competition:$('#competition').value.trim(),home_team:home,away_team:away,kickoff_at:localToIso(kickoff),market_group:$('#marketGroup').value,selection:$('#selection').value.trim(),odds:$('#odds').value?Number($('#odds').value):null,grade:$('#grade').value,confidence:$('#confidence').value?Number($('#confidence').value):null,rationale:$('#rationale').value.trim()||null,published:$('#published').checked,fixture_key:`${kickoff.slice(0,10)}|${slug(home)}|${slug(away)}`};
    const q=editingId?sb.from('football_signals').update(payload).eq('id',editingId):sb.from('football_signals').insert(payload);
    const {error}=await q;
    btn.disabled=false;
    if(error){msg(error.message||'Could not save signal.','error');return;}
    const wasEditing=!!editingId;
    resetForm();msg(wasEditing?'Signal updated.':'Signal created.','ok');await Promise.all([load(),loadPipeline()]);
  });

  $('#syncFixtures')?.addEventListener('click',async()=>{
    const btn=$('#syncFixtures');
    const date=$('#syncDate').value||watDate();
    btn.disabled=true;btn.textContent='Syncing…';syncMsg('Importing fixtures. Nothing will be auto-published.');
    const {data,error}=await sb.functions.invoke('football-fixture-intake',{body:{date}});
    btn.disabled=false;btn.textContent='1. Sync fixtures';
    if(error){syncMsg(await edgeError(error,'Fixture sync failed.'),'error');return;}
    if(!data?.ok){syncMsg(data?.error||'Fixture sync did not complete.','error');return;}
    syncMsg(`${data.message||'Fixture sync complete'} Seen ${data.fixtures_seen||0} · saved ${data.fixtures_written||0} · waiting candidates ${data.candidates_created||0}.`,'ok');
    await loadPipeline();
  });

  $('#enrichEvidence')?.addEventListener('click',async()=>{
    const date=$('#syncDate').value||watDate();
    await enrichEvidence({date,limit:12},$('#enrichEvidence'));
  });

  $('#syncDate')?.addEventListener('change',()=>{syncMsg('');loadPipeline();});
  $('#fixtureList')?.addEventListener('click',async e=>{
    const enrichButton=e.target.closest('[data-enrich-fixture]');
    if(enrichButton){await enrichEvidence({fixture_id:enrichButton.dataset.enrichFixture,limit:1},enrichButton);return;}
    const id=e.target.closest('[data-use-fixture]')?.dataset.useFixture;
    if(!id)return;
    const f=fixtures.find(x=>x.id===id);if(f)useFixture(f);
  });

  $('#cancelEdit').addEventListener('click',resetForm);
  $('#reloadSignals').addEventListener('click',load);
  $$('.manager-chip').forEach(btn=>btn.addEventListener('click',()=>{managerFilter=btn.dataset.managerFilter;$$('.manager-chip').forEach(b=>b.classList.toggle('active',b===btn));render();}));

  $('#adminSignals').addEventListener('click',async e=>{
    const card=e.target.closest('[data-id]');if(!card)return;
    const r=rows.find(x=>x.id===card.dataset.id);if(!r)return;
    if(e.target.dataset.action==='edit'){editRow(r);return;}
    if(e.target.dataset.action==='publish'){
      const {error}=await sb.from('football_signals').update({published:!r.published}).eq('id',r.id);if(!error)await load();return;
    }
    if(e.target.dataset.result){
      const {error}=await sb.from('football_signals').update({result_status:e.target.dataset.result}).eq('id',r.id);if(!error)await load();return;
    }
    if(e.target.dataset.action==='remove'){
      if(!confirm(`Remove ${r.home_team} vs ${r.away_team}?`))return;
      const {error}=await sb.from('football_signals').delete().eq('id',r.id);if(!error)await load();
    }
  });

  (async()=>{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){location.replace('login.html?next=admin.html');return;}
    const {data:admin,error}=await sb.from('football_admins').select('role').eq('user_id',session.user.id).maybeSingle();
    document.documentElement.classList.add('admin-ready');
    if(error||!admin){$('#accessDenied').hidden=false;return;}
    $('#adminRole').textContent=String(admin.role||'ADMIN').toUpperCase();
    $('#adminArea').hidden=false;
    $('#syncDate').value=watDate();
    await Promise.all([load(),loadPipeline()]);
  })();
})();