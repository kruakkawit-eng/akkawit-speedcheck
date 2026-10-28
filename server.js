'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=Number(process.env.PORT||3000),HOST=process.env.HOST||'0.0.0.0',root=__dirname;
const chunk=crypto.randomBytes(1024*1024);
const staticFiles={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js'};
const mime={'index.html':'text/html; charset=utf-8','style.css':'text/css; charset=utf-8','app.js':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400);return res.end();}
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  const p=url.pathname;
  if(p==='/api/ping'){if(req.method!=='GET'){res.writeHead(405);return res.end();}res.writeHead(204);return res.end();}
  if(p==='/api/download'){
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    const requested=Number(url.searchParams.get('bytes'));
    const size=Number.isSafeInteger(requested)?Math.min(Math.max(requested,1024),8*1024*1024):8*1024*1024;
    res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':size,'Content-Encoding':'identity'});
    let left=size;
    const write=()=>{while(left>0&&!res.destroyed){const n=Math.min(left,chunk.length);left-=n;if(!res.write(chunk.subarray(0,n)))return res.once('drain',write);}if(!res.destroyed)res.end();};
    return write();
  }
  if(p==='/api/upload'){
    if(req.method!=='POST'){res.writeHead(405);return res.end();}
    let received=0,tooLarge=false;
    req.on('data',c=>{received+=c.length;if(received>2*1024*1024&&!tooLarge){tooLarge=true;res.writeHead(413);res.end('Too large');req.resume();}});
    req.on('end',()=>{if(tooLarge||res.writableEnded)return;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({received}));});
    return;
  }
  if(req.method!=='GET'||!(p in staticFiles)){res.writeHead(404);return res.end('Not found');}
  const file=staticFiles[p];
  if(file==='index.html')res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'");
  const stream=fs.createReadStream(path.join(root,file));
  stream.on('open',()=>{res.writeHead(200,{'Content-Type':mime[file]});stream.pipe(res);});
  stream.on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end('Server error');});
});
server.requestTimeout=45000;
server.listen(PORT,HOST,()=>console.log(`AKKAWIT SpeedCheck 2.0 on ${PORT}`));
