const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const root = __dirname;
const chunk = crypto.randomBytes(1024 * 1024);
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(url.pathname === '/api/ping') { res.writeHead(204); return res.end(); }
  if(url.pathname === '/api/download') {
    if(req.method !== 'GET') {res.writeHead(405); return res.end();}
    const size = Math.min(Math.max(Number(url.searchParams.get('bytes')) || 8000000, 1024), 32 * 1024 * 1024);
    res.writeHead(200, {'Content-Type':'application/octet-stream','Content-Length':size});
    let left = size;
    const write = () => { while(left > 0) {const len = Math.min(left, chunk.length); left -= len; if(!res.write(chunk.subarray(0,len))) return res.once('drain',write);} res.end();};
    return write();
  }
  if(url.pathname === '/api/upload') {
    if(req.method !== 'POST') {res.writeHead(405); return res.end();}
    let received=0;
    req.on('data', c => { received+=c.length; if(received > 32*1024*1024) req.destroy(); });
    req.on('end', () => {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({received}));});
    return;
  }
  if(req.method === 'GET' && url.pathname === '/style.css') {res.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});return fs.createReadStream(path.join(root,'style.css')).pipe(res);}
  if(req.method === 'GET' && url.pathname === '/app.js') {res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});return fs.createReadStream(path.join(root,'app.js')).pipe(res);}
  if(req.method !== 'GET' || !['/','/index.html'].includes(url.pathname)) {res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'"});
  fs.createReadStream(path.join(root,'index.html')).pipe(res);
});
server.requestTimeout = 45000;
server.listen(PORT,HOST,()=>console.log(`AKKAWIT SpeedCheck running at http://localhost:${PORT}`));
