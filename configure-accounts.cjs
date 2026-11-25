const fs=require('node:fs');
const url=(process.env.PARK_SUPABASE_URL||'').trim(),key=(process.env.PARK_SUPABASE_PUBLISHABLE_KEY||'').trim();
if(Boolean(url)!==Boolean(key))throw Error('Set both PARK_SUPABASE_URL and PARK_SUPABASE_PUBLISHABLE_KEY, or neither.');
if(url){const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('Use the HTTPS Supabase project URL.');if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw Error('Only a Supabase publishable key is allowed; never enter a service-role or secret key.');}
fs.writeFileSync(process.argv[2],'window.PARK_ACCOUNTS = '+JSON.stringify({url,key})+';\n');
