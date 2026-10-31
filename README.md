# Guilhed Hub 🎮

Site com todos os seus vídeos do **YouTube** e **TikTok** em um só lugar, com visual de games / cultura pop.
Atualiza sozinho a cada 6 horas, é hospedado de graça no GitHub Pages e não precisa de servidor.

## Como funciona
- `scripts/update.mjs` busca os vídeos do YouTube pelo feed RSS do canal e os do TikTok com o `yt-dlp` (mais oEmbed para título e miniatura).
- Os vídeos ficam guardados em `data/history.json`, então o histórico cresce com o tempo (o RSS do YouTube só mostra os 15 mais recentes).
- O resultado vai para `public/data.json`, que o site (`public/`) lê.
- O GitHub Actions (`.github/workflows/update.yml`) repete isso a cada 6 horas e publica no GitHub Pages.

## Publicar (uma vez só)
1. Crie um repositório no GitHub e envie esta pasta (branch `main`).
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Vá em **Actions → "Atualizar e publicar" → Run workflow**.
4. Seu site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
5. Domínio próprio: Settings → Pages → Custom domain.

## Gerenciar manualmente (arquivo `config.json`)
| Campo | Para quê |
|---|---|
| `name`, `bio` | Nome e texto do topo |
| `pinned` | Fixar no topo. Lista de IDs ou trechos de URL |
| `hidden` | Esconder vídeos. Mesma regra |
| `titleOverrides` | Trocar o título: `{ "ID_DO_VIDEO": "Novo título" }` |
| `manualVideos` | Adicionar vídeos que a busca automática não pega |
| `maxItems` | Limite de vídeos exibidos |
| `tiktokAutoFetch` | `false` se quiser só TikToks manuais |
| `youtubeChannelId` | Opcional (`UC...`). Se vazio, é descoberto pelo `@Guilhed` |

Exemplo:
```json
"pinned": ["dQw4w9WgXcQ"],
"hidden": ["https://www.tiktok.com/@guilhed/video/1234567890"],
"titleOverrides": { "dQw4w9WgXcQ": "Meu melhor vídeo" },
"manualVideos": [
  { "platform": "tiktok", "url": "https://vm.tiktok.com/XXXX/" },
  { "platform": "youtube", "url": "https://youtu.be/XXXXXXXXXXX", "title": "Vídeo não listado" }
]
```
Editou o `config.json`? Faça commit. O site se atualiza sozinho em ~1 minuto.

## Testar no computador
```bash
pip install yt-dlp     # opcional, para o TikTok automático
npm run update         # gera public/data.json
npm start              # abre em http://localhost:3000
```
Precisa de Node 20 ou mais novo.

## Limitações
- O TikTok não tem API pública sem aprovação, então o `yt-dlp` pode falhar de vez em quando (o TikTok muda coisas). Se isso acontecer, o YouTube continua funcionando e você usa `manualVideos` para o TikTok.
- As miniaturas do TikTok são links temporários, e por isso são renovadas a cada atualização.
- Se algum vídeo seu foi apagado, remova-o do `data/history.json`, ou use `hidden`.
