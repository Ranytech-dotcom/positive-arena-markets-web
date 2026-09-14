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
    .select('user_id,plan,access_status,trial_started_at,trial_ends_at,paid_until')
    .eq('user_id',session.user.id)
    .maybeSingle();

  if(error){
    console.error('Membership lookup failed',error);
    location.replace('trial-expired.html?reason=membership_error');
    return;
  }

  if(!membership){
    const created=await sb
      .from('market_memberships')
      .insert({user_id:session.user.id})
      .select('user_id,plan,access_status,trial_started_at,trial_ends_at,paid_until')
      .single();
    if(created.error||!created.data){
      console.error('Membership creation failed',created.error);
      location.replace('trial-expired.html?reason=membership_error');
      return;
    }
    membership=created.data;
  }

  const now=Date.now();
  const trialEnd=membership.trial_ends_at?new Date(membership.trial_ends_at).getTime():0;
  const paidEnd=membership.paid_until?new Date(membership.paid_until).getTime():0;
  const activeTrial=membership.plan==='trial'&&trialEnd>now;
  const activePaid=membership.plan==='paid'&&paidEnd>now;
  const activeLifetime=membership.plan==='lifetime';
  const allowed=membership.access_status==='active'&&(activeTrial||activePaid||activeLifetime);

  if(!allowed){
    location.replace('trial-expired.html');
    return;
  }

  const daysRemaining=activeTrial?Math.max(1,Math.ceil((trialEnd-now)/dayMs)):null;
  window.PA_MEMBERSHIP={...membership,daysRemaining};

  const userEmail=document.getElementById('memberEmail');
  if(userEmail) userEmail.textContent=session.user?.email||'Member';

  const trialBadge=document.getElementById('trialBadge');
  if(trialBadge){
    trialBadge.textContent=activeTrial?`TRIAL ${daysRemaining} DAY${daysRemaining===1?'':'S'} LEFT`:membership.plan.toUpperCase();
  }

  const trialInfo=document.getElementById('trialInfo');
  if(trialInfo){
    if(activeTrial){
      const endText=new Date(membership.trial_ends_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
      trialInfo.innerHTML=`30-day free trial active.<br><b>${daysRemaining} day${daysRemaining===1?'':'s'} remaining</b><br>Trial ends: ${endText}`;
    }else if(activePaid){
      trialInfo.textContent='Paid membership active.';
    }else{
      trialInfo.textContent='Lifetime membership active.';
    }
  }

  document.documentElement.classList.add('auth-ready');
})();

window.PA_SIGN_OUT=async()=>{
  await sb.auth.signOut();
  location.replace('login.html');
};
