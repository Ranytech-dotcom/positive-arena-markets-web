(()=>{
  const URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
  const KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
  const sb=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let rows=[];
  let editingId=null;
  let managerFilter='ALL';

  const fmt=value=>new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
  const slug=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const localToIso=value=>new Date(`${value}:00+01:00`).toISOString();
  const isoToLocal=value=>{
    const d=new Date(value);
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
    const get=t=>p.find(x=>x.type===t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  };
  const msg=(text,kind='')=>{const el=$('#formMessage');el.textContent=text||'';el.className='admin-message '+kind;};

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

  function resetForm(){
    editingId=null;$('#signalForm').reset();$('#published').checked=true;$('#editorTitle').textContent='New signal';$('#saveSignal').textContent='Publish signal';$('#cancelEdit').hidden=true;msg('');
  }

  function editRow(r){
    editingId=r.id;
    $('#competition').value=r.competition||'';$('#homeTeam').value=r.home_team||'';$('#awayTeam').value=r.away_team||'';$('#kickoff').value=isoToLocal(r.kickoff_at);$('#marketGroup').value=r.market_group;$('#selection').value=r.selection||'';$('#odds').value=r.odds??'';$('#grade').value=r.grade;$('#confidence').value=r.confidence??'';$('#rationale').value=r.rationale||'';$('#published').checked=!!r.published;
    $('#editorTitle').textContent='Edit signal';$('#saveSignal').textContent='Save changes';$('#cancelEdit').hidden=false;window.scrollTo({top:0,behavior:'smooth'});
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
    msg(editingId?'Signal updated.':'Signal created.','ok');resetForm();await load();
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
    $('#adminRole').textContent=String(admin.role||'ADMIN').toUpperCase();$('#adminArea').hidden=false;await load();
  })();
})();