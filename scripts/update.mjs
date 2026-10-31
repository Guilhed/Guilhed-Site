// Busca vídeos do YouTube (RSS) e TikTok (yt-dlp + oEmbed), mescla com o histórico
// e gera public/data.json. Roda no GitHub Actions a cada 6 horas.
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const cfg = JSON.parse(await fs.readFile('config.json', 'utf8'));
let history = {};
try { history = JSON.parse(await fs.readFile('data/history.json', 'utf8')); } catch {}

const dec = s => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const tag = (b, t) => (b.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>')) || [])[1];
const save = (platform, id, data) => {
  const key = platform + ':' + id;
  history[key] = { ...(history[key] || {}), ...data, id, platform };
};

// ---------- YouTube ----------
async function youtube() {
  let id = cfg.youtubeChannelId;
  if (!id) {
    const r = await fetch('https://www.youtube.com/' + cfg.youtubeHandle, {
      headers: { 'user-agent': UA, 'accept-language': 'pt-BR', cookie: 'CONSENT=YES+1' }
    });
    const html = await r.text();
    id = (html.match(/"channelId":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/) || [])[1];
  }
  if (!id) throw new Error('Não achei o channel ID. Preencha "youtubeChannelId" no config.json.');
  const res = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + id, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error('RSS do YouTube respondeu ' + res.status);
  const xml = await res.text();
  let n = 0;
  for (const e of xml.split('<entry>').slice(1)) {
    const vid = tag(e, 'yt:videoId');
    if (!vid) continue;
    const views = (e.match(/<media:statistics views="(\d+)"/) || [])[1];
    save('youtube', vid, {
      title: dec(tag(e, 'title')),
      url: 'https://www.youtube.com/watch?v=' + vid,
      thumbnail: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg',
      date: tag(e, 'published'),
      views: views ? Number(views) : undefined
    });
    n++;
  }
  console.log('YouTube: ' + n + ' vídeos (canal ' + id + ')');
}

// ---------- TikTok ----------
const ttDate = id => new Date(Number(BigInt(id) >> 32n) * 1000).toISOString(); // o ID do TikTok embute a data

async function oembed(url) {
  const r = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error('oEmbed ' + r.status);
  return r.json();
}

async function tiktok() {
  const urls = new Set();
  if (cfg.tiktokAutoFetch) {
    try {
      const out = execFileSync('yt-dlp', ['--flat-playlist', '--dump-single-json', '--playlist-end', '40',
        'https://www.tiktok.com/@' + cfg.tiktokUser], { encoding: 'utf8', maxBuffer: 50e6, timeout: 180000 });
      for (const e of JSON.parse(out).entries || [])
        urls.add('https://www.tiktok.com/@' + cfg.tiktokUser + '/video/' + e.id);
    } catch (e) { console.warn('yt-dlp falhou (use manualVideos como alternativa):', e.message.split('\n')[0]); }
  }
  for (const m of cfg.manualVideos) if (m.platform === 'tiktok' && m.url) urls.add(m.url);
  let n = 0;
  for (let url of urls) {
    try {
      if (!/video\/\d+/.test(url)) url = (await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA } })).url; // links curtos vm.tiktok.com
      const id = (url.match(/video\/(\d+)/) || [])[1];
      if (!id) continue;
      const clean = url.split('?')[0];
      try {
        const o = await oembed(clean);
        save('tiktok', id, { title: o.title || 'Vídeo do TikTok', url: clean, thumbnail: o.thumbnail_url, date: ttDate(id) });
      } catch { save('tiktok', id, { title: history['tiktok:' + id]?.title || 'Vídeo do TikTok', url: clean, date: ttDate(id) }); }
      n++;
    } catch (e) { console.warn('TikTok ignorado:', url, e.message); }
  }
  console.log('TikTok: ' + n + ' vídeos');
}

// ---------- YouTube manual (ex.: não listados) ----------
async function youtubeManual() {
  for (const m of cfg.manualVideos) {
    if (m.platform !== 'youtube' || !m.url) continue;
    const id = (m.url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) || [])[1];
    if (!id) continue;
    let title = m.title || history['youtube:' + id]?.title || 'Vídeo do YouTube';
    try {
      const o = await (await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(m.url))).json();
      title = m.title || o.title;
    } catch {}
    save('youtube', id, { title, url: 'https://www.youtube.com/watch?v=' + id,
      thumbnail: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg', date: history['youtube:' + id]?.date || new Date().toISOString() });
  }
}

for (const step of [youtube, tiktok, youtubeManual]) {
  try { await step(); } catch (e) { console.warn(step.name + ' falhou:', e.message); }
}

// ---------- Saída ----------
const match = (it, list) => list.some(x => x === it.id || x === it.url || it.url.includes(x));
const items = Object.values(history)
  .filter(it => !match(it, cfg.hidden))
  .map(it => ({ ...it, title: cfg.titleOverrides[it.id] || it.title, pinned: match(it, cfg.pinned) }))
  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  .slice(0, cfg.maxItems);

await fs.mkdir('data', { recursive: true });
await fs.writeFile('data/history.json', JSON.stringify(history, null, 2));
await fs.writeFile('public/data.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  site: { name: cfg.name, bio: cfg.bio,
    youtube: 'https://www.youtube.com/' + cfg.youtubeHandle, tiktok: 'https://www.tiktok.com/@' + cfg.tiktokUser },
  items
}, null, 2));
console.log('Pronto: ' + items.length + ' itens em public/data.json');
