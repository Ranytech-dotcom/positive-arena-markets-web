const SUPABASE_URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
const SUPABASE_KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
window.PA_SUPABASE=sb;

const dayMs=24*60*60*1000;

(async()=>{
  const {data:{session},error:sessionError}=await sb.auth.getSession();
  if(sessionError||!session){
    const next=encodeURIComponent(location.pathname.split('/').pop()||'index.html');
    location.replace('login.html?next='+next);
    return;
  }

  let {data:membership,error}=await sb
    .from('market_memberships')
    .select('user_id,plan,access_status,trial_started_at,trial_ends_at')
    .eq('user_id',session.user.id)
    .maybeSingle();

  if(error){
    console.error('Trial lookup failed',error);
    location.replace('trial-expired.html?reason=trial_error');
    return;
  }

  if(!membership){
    const created=await sb
      .from('market_memberships')
      .insert({user_id:session.user.id,plan:'trial',access_status:'active'})
      .select('user_id,plan,access_status,trial_started_at,trial_ends_at')
      .single();
    if(created.error||!created.data){
      console.error('Trial creation failed',created.error);
      location.replace('trial-expired.html?reason=trial_error');
      return;
    }
    membership=created.data;
  }

  const now=Date.now();
  const trialEnd=membership.trial_ends_at?new Date(membership.trial_ends_at).getTime():0;
  const activeTrial=membership.plan==='trial'&&membership.access_status==='active'&&trialEnd>now;

  if(!activeTrial){
    location.replace('trial-expired.html');
    return;
  }

  const daysRemaining=Math.max(1,Math.ceil((trialEnd-now)/dayMs));
  window.PA_MEMBERSHIP={...membership,daysRemaining};

  const userEmail=document.getElementById('memberEmail');
  if(userEmail) userEmail.textContent=session.user?.email||'Member';

  const trialBadge=document.getElementById('trialBadge');
  if(trialBadge) trialBadge.textContent=`TRIAL ${daysRemaining} DAY${daysRemaining===1?'':'S'} LEFT`;

  const trialInfo=document.getElementById('trialInfo');
  if(trialInfo){
    const endText=new Date(membership.trial_ends_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
    trialInfo.innerHTML=`30-day test trial active.<br><b>${daysRemaining} day${daysRemaining===1?'':'s'} remaining</b><br>Trial ends: ${endText}`;
  }

  document.documentElement.classList.add('auth-ready');
})();

window.PA_SIGN_OUT=async()=>{
  await sb.auth.signOut();
  location.replace('login.html');
};
