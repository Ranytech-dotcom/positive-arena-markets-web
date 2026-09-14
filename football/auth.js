const PAF_SUPABASE_URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
const PAF_SUPABASE_KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
const pafSb=window.supabase.createClient(PAF_SUPABASE_URL,PAF_SUPABASE_KEY);
window.PAF_SUPABASE=pafSb;

const PAF_DAY_MS=24*60*60*1000;

window.PAF_AUTH_READY=(async()=>{
  const {data:{session},error:sessionError}=await pafSb.auth.getSession();
  if(sessionError||!session){
    location.replace('login.html?next=index.html');
    throw sessionError||new Error('No active session');
  }

  let {data:membership,error}=await pafSb
    .from('football_memberships')
    .select('user_id,plan,access_status,trial_started_at,trial_ends_at,paid_until')
    .eq('user_id',session.user.id)
    .maybeSingle();

  if(error){
    console.error('Football membership lookup failed',error);
    location.replace('trial-expired.html?reason=access_error');
    throw error;
  }

  if(!membership){
    const created=await pafSb
      .from('football_memberships')
      .insert({user_id:session.user.id})
      .select('user_id,plan,access_status,trial_started_at,trial_ends_at,paid_until')
      .single();
    if(created.error||!created.data){
      console.error('Football trial creation failed',created.error);
      location.replace('trial-expired.html?reason=access_error');
      throw created.error||new Error('Could not create football trial');
    }
    membership=created.data;
  }

  const now=Date.now();
  const trialEnd=membership.trial_ends_at?new Date(membership.trial_ends_at).getTime():0;
  const paidEnd=membership.paid_until?new Date(membership.paid_until).getTime():0;
  const activeTrial=membership.plan==='trial'&&membership.access_status==='active'&&trialEnd>now;
  const activePaid=membership.plan==='paid'&&membership.access_status==='active'&&paidEnd>now;

  if(!activeTrial&&!activePaid){
    location.replace('trial-expired.html');
    throw new Error('Football access expired');
  }

  const daysRemaining=activeTrial?Math.max(1,Math.ceil((trialEnd-now)/PAF_DAY_MS)):null;
  window.PAF_MEMBERSHIP={...membership,daysRemaining};
  window.PAF_SESSION=session;

  const emailEl=document.getElementById('memberEmail');
  if(emailEl)emailEl.textContent=session.user?.email||'Member';

  const trialBadge=document.getElementById('trialBadge');
  if(trialBadge){
    trialBadge.textContent=activeTrial?`TRIAL ${daysRemaining} DAY${daysRemaining===1?'':'S'} LEFT`:'ACTIVE MEMBER';
  }

  const trialInfo=document.getElementById('trialInfo');
  if(trialInfo){
    if(activeTrial){
      const endText=new Date(membership.trial_ends_at).toLocaleString('en-NG',{timeZone:'Africa/Lagos',dateStyle:'medium',timeStyle:'short'});
      trialInfo.textContent=`${daysRemaining} day${daysRemaining===1?'':'s'} remaining · ends ${endText}`;
    }else{
      trialInfo.textContent='Active member access';
    }
  }

  document.documentElement.classList.add('auth-ready');
  return {session,membership:window.PAF_MEMBERSHIP};
})();

window.PAF_SIGN_OUT=async()=>{
  await pafSb.auth.signOut();
  location.replace('login.html');
};
