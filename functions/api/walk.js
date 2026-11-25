// Cloudflare Pages Function: walking-distance sync between Apple Health (via a Shortcut) and the site.
//   Shortcut (Get Contents of URL):  /api/walk?code=SYNCCODE&unit=mi&data=2026-11-24T10=0.42|2026-11-24T11=1.15
//   Site (fetch):                    /api/walk?code=SYNCCODE           -> {"hours":{"2026-11-24T10":675.9,...}}
// Needs a KV namespace bound to this Pages project as WALK.

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "cache-control": "no-store" };
const MI = 1609.344;
const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

// forgiving parser: "2026-11-24T10=0.42", extra words, "Nov 24, 2026 at 1:00 PM=1.2 mi", comma decimals
export function parseHours(raw, mult){
  const out = {};
  for (const part of String(raw).split(/[|\n;]+/)){
    const s = part.trim(); let day, hr, val;
    let m = s.match(/(\d{4}-\d{2}-\d{2})[T ](\d{1,2})(?::\d{2})?[^=]*=\s*([\d.,]+)/);
    if (m){ day = m[1]; hr = +m[2]; val = m[3]; }
    else {
      m = s.match(/([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})(?:,| at)? (\d{1,2}):\d{2}\s*([AaPp][Mm])?[^=]*=\s*([\d.,]+)/);
      if (!m || !MONTHS[m[1].toLowerCase()]) continue;
      hr = m[5] ? (+m[4] % 12) + (/p/i.test(m[5]) ? 12 : 0) : +m[4];
      day = `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, "0")}-${m[2].padStart(2, "0")}`; val = m[6];
    }
    const v = parseFloat(val.replace(",", "."));
    if (!isFinite(v) || hr > 23) continue;
    out[`${day}T${String(hr).padStart(2, "0")}`] = Math.round(v * mult * 10) / 10;
  }
  return out;
}

export async function onRequestOptions(){ return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request, env }){
  const q = new URL(request.url).searchParams;
  const code = q.get("code") || "";
  if (!/^[A-Za-z0-9]{8,40}$/.test(code)) return new Response("Missing or bad sync code", { status: 400, headers: CORS });
  if (!env.WALK) return new Response("Sync isn't set up yet: bind a KV namespace named WALK to this Pages project.", { status: 503, headers: CORS });
  const key = "walk:" + code;
  const stored = (await env.WALK.get(key, "json")) || {};
  const data = q.get("data");
  if (data == null) return new Response(JSON.stringify({ hours: stored }), { headers: { ...CORS, "content-type": "application/json" } });

  const unit = (q.get("unit") || "mi").toLowerCase();
  const mult = unit.startsWith("k") ? 1000 : unit === "m" ? 1 : MI;
  const add = parseHours(data, mult), n = Object.keys(add).length;
  const merged = { ...stored, ...add };
  const keys = Object.keys(merged).sort();                      // keep ~1 year of hours
  while (keys.length > 24 * 400) delete merged[keys.shift()];
  await env.WALK.put(key, JSON.stringify(merged));
  const total = Object.values(add).reduce((a, b) => a + b, 0);
  return new Response(n ? `Saved ${n} hour${n === 1 ? "" : "s"} · ${(total / MI).toFixed(2)} mi` : "Nothing to save — check the Text action.",
    { headers: { ...CORS, "content-type": "text/plain; charset=utf-8" } });
}
