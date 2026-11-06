// The SPA fallback has no <head> title (it is rendered client-side); add one so the 404 page is valid.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'build/404.html';
const h = readFileSync(f, 'utf8');
if (!h.includes('<title>')) writeFileSync(f, h.replace('</head>', '<title>Page not found · Stockroom</title></head>'));
