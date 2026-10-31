const $ = id => document.getElementById(id);
let items = [], platform = 'all';

const fmtDate = d => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

function render() {
  const q = $('q').value.trim().toLowerCase();
  const list = items.filter(i => (platform === 'all' || i.platform === platform) && (!q || i.title.toLowerCase().includes(q)))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)); // fixados primeiro; resto já vem por data
  const grid = $('grid'); grid.textContent = '';
  if (!list.length) {
    const e = document.createElement('div'); e.className = 'empty';
    e.textContent = items.length ? 'Nada encontrado.' : 'Nenhum conteúdo ainda. Rode a atualização!';
    grid.appendChild(e); return;
  }
  for (const i of list) {
    const c = document.createElement('button');
    c.className = 'card ' + i.platform;
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    if (i.thumbnail) {
      const img = document.createElement('img'); img.src = i.thumbnail; img.alt = ''; img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer'; img.onerror = () => img.remove();
      thumb.appendChild(img);
    }
    const p = document.createElement('div'); p.className = 'play'; thumb.appendChild(p);
    const info = document.createElement('div'); info.className = 'info';
    const meta = document.createElement('div'); meta.className = 'meta';
    const a = document.createElement('span'); a.textContent = i.platform === 'youtube' ? 'YOUTUBE' : 'TIKTOK';
    const b = document.createElement('span'); b.textContent = fmtDate(i.date);
    meta.append(a, b);
    const t = document.createElement('div'); t.className = 'title'; t.textContent = i.title;
    info.append(meta, t);
    c.append(thumb, info);
    if (i.pinned) { const pin = document.createElement('div'); pin.className = 'pin'; pin.textContent = '★ FIXADO'; c.appendChild(pin); }
    c.onclick = () => openPlayer(i);
    grid.appendChild(c);
  }
}

function openPlayer(i) {
  const src = i.platform === 'youtube'
    ? 'https://www.youtube-nocookie.com/embed/' + i.id + '?autoplay=1&rel=0'
    : 'https://www.tiktok.com/embed/v2/' + i.id;
  $('box').classList.toggle('vertical', i.platform === 'tiktok');
  const f = document.createElement('iframe');
  f.src = src; f.allow = 'autoplay; encrypted-media; fullscreen'; f.allowFullscreen = true;
  $('player').textContent = ''; $('player').appendChild(f);
  $('modal').hidden = false;
}
function closePlayer() { $('modal').hidden = true; $('player').textContent = ''; }
$('close').onclick = closePlayer;
$('modal').onclick = e => { if (e.target === $('modal')) closePlayer(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlayer(); });

$('chips').append(...[['all', 'TODOS'], ['youtube', 'YOUTUBE'], ['tiktok', 'TIKTOK']].map(([k, label]) => {
  const b = document.createElement('button'); b.className = 'chip' + (k === 'all' ? ' on' : ''); b.textContent = label;
  b.onclick = () => { platform = k; document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); render(); };
  return b;
}));
$('q').oninput = render;

fetch('data.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
  items = d.items || [];
  if (d.site.name) { $('name').textContent = d.site.name; document.title = d.site.name + ' — Games & Cultura Pop'; }
  $('bio').textContent = d.site.bio || '';
  $('ytLink').href = d.site.youtube || '#'; $('ttLink').href = d.site.tiktok || '#';
  if (d.generatedAt) $('foot').textContent = 'Atualizado em ' + new Date(d.generatedAt).toLocaleString('pt-BR');
  render();
}).catch(() => { $('grid').innerHTML = '<div class="empty">Não consegui carregar os dados.</div>'; });
