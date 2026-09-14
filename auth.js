const SUPABASE_URL='https://nsmevyhcpqijreuwbqkv.supabase.co';
const SUPABASE_KEY='sb_publishable_vmjgX7GlO7iB32tlZRPfBQ__qv6ZixS';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
window.PA_SUPABASE=sb;

(async()=>{
  const {data:{session}}=await sb.auth.getSession();
  if(!session){
    const next=encodeURIComponent(location.pathname.split('/').pop()||'index.html');
    location.replace('login.html?next='+next);
    return;
  }
  document.documentElement.classList.add('auth-ready');
  const userEmail=document.getElementById('memberEmail');
  if(userEmail) userEmail.textContent=session.user?.email||'Member';
})();

window.PA_SIGN_OUT=async()=>{
  await sb.auth.signOut();
  location.replace('login.html');
};
