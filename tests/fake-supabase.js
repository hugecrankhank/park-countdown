// Minimal fake supabase-js for UI tests. State lives in localStorage 'fakesb' so it survives reloads.
(function(){
const S=()=>JSON.parse(localStorage.getItem('fakesb')||'{}');const W=s=>localStorage.setItem('fakesb',JSON.stringify(s));
function q(table){let rows=()=> (S().tables?.[table]||[]);let filters=[];let single=false,maybe=false;
 const api={select(){return api},order(){return api},eq(k,v){filters.push(r=>r[k]===v);return api},is(k,v){filters.push(r=>r[k]==null);return api},
  single(){single=true;return api},maybeSingle(){maybe=true;return api},
  then(res,rej){let out=rows().filter(r=>filters.every(f=>f(r)));let data=single||maybe?(out[0]||null):out;if(single&&!data)return Promise.resolve({data:null,error:{message:'not found'}}).then(res,rej);return Promise.resolve({data,error:null}).then(res,rej)}};return api}
window.supabase={createClient(){const s=S();return{
 auth:{getSession:async()=>({data:{session:S().user?{}:null},error:null}),getUser:async()=>({data:{user:S().user},error:null}),onAuthStateChange(){},signOut:async()=>({error:null})},
 from:q,
 rpc:async(name,args)=>{const st=S();(st.calls=st.calls||[]).push({name,args});W(st);const r=(st.rpc||{})[name];
  if(name==='claim_trip_share'&&st.claimInsert){const t=st.claimInsert;st.tables=st.tables||{};(st.tables.account_trips=st.tables.account_trips||[]).push(t);st.tables.account_sync_snapshots=[{scope:'trip:'+t.id,revision:1,payload:st.rpc.claim_trip_share.plan,owner_id:st.user.id}];W(st)}
  if(name==='planner_invite_status'||name==='planner_collaboration_status'||name==='my_collaboration_updates')return {data:[],error:null};
  return {data:r===undefined?null:r,error:null}}}}};
})();
