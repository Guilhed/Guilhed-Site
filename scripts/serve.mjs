// Servidor local simples para testar: npm start  ->  http://localhost:3000
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const p = req.url.split('?')[0];
  const file = path.join('public', p === '/' ? 'index.html' : p);
  try { res.writeHead(200, { 'content-type': types[path.extname(file)] || 'text/plain' }); res.end(await fs.readFile(file)); }
  catch { res.writeHead(404); res.end('404'); }
}).listen(3000, () => console.log('http://localhost:3000'));
