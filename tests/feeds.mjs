// Unit test for the News & videos feed parser (no network).
import { parseBlog, parseYouTube, cleanChannel, decode } from '../functions/api/feeds.js';
import assert from 'node:assert';
const rss=`<rss><channel><title>Blog</title><item><title><![CDATA[New ride &amp; show <b>opens</b>]]></title><link>https://example.com/a</link><pubDate>Wed, 25 Nov 2026 14:00:00 +0000</pubDate><description>long text</description></item><item><title>Bad</title><link>javascript:alert(1)</link></item></channel></rss>`;
const b=parseBlog(rss,'Blog');assert.equal(b.length,1);assert.equal(b[0].title,'New ride & show opens');assert.equal(b[0].date,'2026-11-25T14:00:00.000Z');assert.ok(!('description' in b[0]));
const atom=`<feed><title>Chan</title><entry><yt:videoId>abcdefghijk</yt:videoId><title>Top 10 &#39;tips&#39;</title><author><name>Chan Name</name></author><published>2026-11-24T10:00:00+00:00</published></entry><entry><yt:videoId>bad id</yt:videoId><title>x</title></entry></feed>`;
const v=parseYouTube(atom);assert.equal(v.length,1);assert.equal(v[0].videoId,'abcdefghijk');assert.equal(v[0].title,"Top 10 'tips'");assert.equal(v[0].source,'Chan Name');
assert.equal(cleanChannel('https://www.youtube.com/@DFBGuide/videos'),'DFBGuide');assert.equal(cleanChannel('@Mickey.Views'),'Mickey.Views');
assert.equal(cleanChannel('https://youtube.com/channel/UCabcdefghijklmnopqrstuv'),'UCabcdefghijklmnopqrstuv');assert.equal(cleanChannel('https://evil.example/x y'),'');assert.equal(cleanChannel('a/../b'),'');
assert.equal(decode('<script>x</script>&lt;b&gt;'),'x<b>');
console.log('PASS: feed parsing, link safety, channel cleaning');
