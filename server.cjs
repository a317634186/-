const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || '0.0.0.0';

http.createServer((request, response) => {
  const requestPath = request.url.split('?')[0] === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.join(root, requestPath);
  if (!filePath.startsWith(root)) { response.writeHead(403); response.end(); return; }
  fs.readFile(filePath, (error, data) => {
    if (error) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    response.end(data);
  });
}).listen(port, host, () => console.log(`PrimeOps preview: http://${host}:${port}`));
