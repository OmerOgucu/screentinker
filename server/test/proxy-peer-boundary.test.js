'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {parseTrustedProxies,cloudflareIps}=require('../config/cloudflareIps');
async function withApp(trust,fn){
 const app=express();app.set('trust proxy',trust);app.get('/',(req,res)=>res.json({ip:req.ip}));
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});
 try{await fn('http://127.0.0.1:'+server.address().port);}finally{await new Promise(r=>server.close(r));}
}
test('direct loopback cannot forge its identity through X-Forwarded-For',async()=>{
 await withApp(cloudflareIps,async base=>{const r=await fetch(base,{headers:{'X-Forwarded-For':'203.0.113.77'}});assert.equal((await r.json()).ip,'127.0.0.1');});
});
test('an explicitly trusted reverse proxy supplies the client IP',async()=>{
 await withApp(parseTrustedProxies('127.0.0.1/32'),async base=>{const r=await fetch(base,{headers:{'X-Forwarded-For':'203.0.113.77'}});assert.equal((await r.json()).ip,'203.0.113.77');});
});
test('proxy configuration is explicit and validated',()=>{
 assert.deepEqual(parseTrustedProxies(''),[]);
 assert.deepEqual(parseTrustedProxies(' 127.0.0.1/32, ::1/128 '),['127.0.0.1/32','::1/128']);
 for(const v of ['true','loopback','10.0.0.1/33','::1/129','127.0.0.1/','127.0.0.1/24/1'])assert.throws(()=>parseTrustedProxies(v),/TRUSTED_PROXY_CIDRS/);
});
