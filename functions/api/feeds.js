// Cloudflare Pages Function: latest Disney planning posts and videos for the News & videos page.
//   /api/feeds                 -> { items:[{kind,title,link,source,date,videoId?}], sources:[{name,kind,ok}] }
//   /api/feeds?yt=handle,UC... -> also includes those YouTube channels (the person's own picks)
// Only headlines and links are passed along: no article text. Blogs come from a fixed list (this is not an
// open proxy); YouTube uses each channel's public feed, so no API key is needed.

export const BLOGS = [
  { name: "Disney Parks Blog", url: "https://disneyparksblog.com/feed/" },
  { name: "Disney Food Blog", url: "https://www.disneyfoodblog.com/feed/" },
  { name: "BlogMickey", url: "https://blogmickey.com/feed/" },
  { name: "Disney Tourist Blog", url: "https://www.disneytouristblog.com/feed/" },
  { name: "TouringPlans", url: "https://touringplans.com/blog/feed/" },
];
export const CHANNELS = ["DisneyParks", "DFBGuide", "AllEarsNet", "MickeyViews", "TheTimTracker", "ProvostParkPass", "PagingMrMorrow", "ResortTV1"];

const UA = { "user-agent": "Mozilla/5.0 (compatible; ParkDayCountdown/2; +https://park-countdown-v2.pages.dev)", "accept-language": "en-US,en;q=0.9" };
const HEAD = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" };

export function decode(s){
  return String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
const tag = (xml, name) => { const m = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i")); return m ? m[1] : ""; };
const iso = s => { const t = Date.parse(decode(s)); return Number.isFinite(t) ? new Date(t).toISOString() : ""; };

export function parseBlog(xml, source, limit = 6){
  const out = [];
  for (const m of String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)){
    const title = decode(tag(m[0], "title")).slice(0, 200), link = decode(tag(m[0], "link"));
    if (!title || !/^https:\/\/[^\s"'<>]+$/.test(link)) continue;
    out.push({ kind: "blog", title, link, source, date: iso(tag(m[0], "pubDate")) });
    if (out.length >= limit) break;
  }
  return out;
}
export function parseYouTube(xml, limit = 5){
  const out = [], channel = decode(tag(String(xml).split(/<entry\b/i)[0], "title")) || "YouTube";
  for (const m of String(xml).matchAll(/<entry\b[\s\S]*?<\/entry>/gi)){
    const id = decode(tag(m[0], "yt:videoId")), title = decode(tag(m[0], "title")).slice(0, 200);
    if (!/^[\w-]{11}$/.test(id) || !title) continue;
    out.push({ kind: "video", title, link: "https://www.youtube.com/watch?v=" + id, videoId: id, source: decode(tag(tag(m[0], "author"), "name")) || channel, date: iso(tag(m[0], "published")) });
    if (out.length >= limit) break;
  }
  return out;
}
// "@DFBGuide", "DFBGuide", "https://youtube.com/@DFBGuide", "UCxxxx", "https://www.youtube.com/channel/UCxxxx" -> "DFBGuide" | "UCxxxx" | ""
export function cleanChannel(raw){
  let s = String(raw || "").trim();
  const id = s.match(/(UC[\w-]{22})(?![\w-])/); if (id && (s === id[1] || /channel\//.test(s))) return id[1];
  s = s.replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
  return /^[\w.-]{2,40}$/.test(s) ? s : "";
}

async function get(url){
  const r = await fetch(url, { headers: { ...UA, cookie: "SOCS=CAI; CONSENT=YES+1" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
}
async function channelId(name, cache){
  if (/^UC[\w-]{22}$/.test(name)) return name;
  const key = new Request("https://feeds.internal/yt-handle/" + name.toLowerCase());
  const hit = cache && await cache.match(key); if (hit) return hit.text();
  const html = await get("https://www.youtube.com/@" + encodeURIComponent(name));
  const m = html.match(/channel_id=(UC[\w-]{22})/) || html.match(/"(?:externalId|channelId|browseId)":"(UC[\w-]{22})"/);
  if (!m) throw new Error("channel not found");
  if (cache) await cache.put(key, new Response(m[1], { headers: { "cache-control": "public, max-age=2592000" } }));
  return m[1];
}

export async function onRequestGet({ request, waitUntil }){
  const url = new URL(request.url);
  const extra = [...new Set((url.searchParams.get("yt") || "").split(",").map(cleanChannel).filter(Boolean))].slice(0, 8);
  const cache = typeof caches !== "undefined" && caches.default ? caches.default : null;
  const key = new Request(url.origin + "/api/feeds?yt=" + extra.map(x => x.toLowerCase()).sort().join(","));
  const hit = cache && await cache.match(key); if (hit) return hit;

  const sources = [];
  const blogJobs = BLOGS.map(async b => {
    try { const items = parseBlog(await get(b.url), b.name); sources.push({ name: b.name, kind: "blog", ok: items.length > 0 }); return items; }
    catch (e) { sources.push({ name: b.name, kind: "blog", ok: false }); return []; }
  });
  const names = [...new Set([...CHANNELS, ...extra])];
  const ytJobs = names.map(async n => {
    try { const items = parseYouTube(await get("https://www.youtube.com/feeds/videos.xml?channel_id=" + await channelId(n, cache)));
      sources.push({ name: items[0]?.source || n, handle: n, kind: "video", ok: items.length > 0, mine: extra.includes(n) && !CHANNELS.includes(n) }); return items; }
    catch (e) { sources.push({ name: n, handle: n, kind: "video", ok: false, mine: extra.includes(n) && !CHANNELS.includes(n) }); return []; }
  });
  const items = (await Promise.all([...blogJobs, ...ytJobs])).flat().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 120);
  const good = items.length > 0;
  const res = new Response(JSON.stringify({ updated: new Date().toISOString(), items, sources: sources.sort((a, b) => a.name.localeCompare(b.name)) }),
    { status: good ? 200 : 502, headers: { ...HEAD, "cache-control": good ? "public, max-age=900" : "no-store" } });
  if (good && cache) waitUntil(cache.put(key, res.clone()));
  return res;
}
