'use strict';
// Opt-in migration boundary. Native clients without credentialed media requests must
// be upgraded before enabling MEDIA_REQUIRE_AUTH on their instance.
const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const path=require('path');
const config=require('../config');
const AUD='st:media';
const TTL=600;
const enabled=()=>['1','true','yes'].includes(String(process.env.MEDIA_REQUIRE_AUTH||'').toLowerCase());
const binding=t=>crypto.createHash('sha256').update(String(t)).digest('hex');
const same=(a,b)=>crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(),crypto.createHash('sha256').update(String(b)).digest());
function cookies(req){const out=Object.create(null);for(const part of String(req.headers.cookie||'').split(';')){const at=part.indexOf('=');if(at<1)continue;try{out[part.slice(0,at).trim()]=decodeURIComponent(part.slice(at+1).trim());}catch{}}return out;}
function options(req){return{httpOnly:true,sameSite:'lax',secure:!!req.secure,path:'/',maxAge:TTL*1000};}
function setDeviceCookie(req,res,device){
 const token=jwt.sign({workspace:device.workspace_id,binding:binding(device.device_token)},config.jwtSecret,{algorithm:'HS256',audience:AUD,subject:device.id,expiresIn:TTL});
 res.cookie('st_media_d_'+binding(device.id).slice(0,12),token,options(req));
}
function setUserCookie(req,res,token){res.cookie('st_media_user',token,options(req));}
function userCanAccess(req,content){
 const c=cookies(req),header=/^Bearer (.+)$/.exec(req.headers.authorization||'');
 const token=header?header[1]:c.st_media_user;
 if(!token)return false;
 try{
  if(token.startsWith('st_'))return require('../middleware/apiToken').tokenReadsWorkspace(token,content.workspace_id);
  const s=require('../middleware/auth').resolveSessionUser(token);
  if(s.viaRecovery)return false;
  if(!content.workspace_id)return true;
  const {db}=require('../db/database'),ws=db.prepare('SELECT * FROM workspaces WHERE id = ?').get(content.workspace_id);
  return !!ws&&!!require('./tenancy').accessContext(s.user.id,s.user.role,ws);
 }catch{return false;}
}
function deviceCanAccess(req,content){
 const {db}=require('../db/database');
 // Existing native clients may authenticate a media request with the same HTTP
 // token pair as deviceTokenAuth, without adopting cookies.
 const header=/^Bearer (.+)$/.exec(req.headers.authorization||'');
 const id=req.headers['x-st-device-id'];
 if(header&&typeof id==='string'){
  const d=db.prepare('SELECT id,workspace_id,device_token,blocked FROM devices WHERE id = ?').get(id);
  if(d&&!d.blocked&&d.device_token&&same(header[1],d.device_token)&&(!content.workspace_id||d.workspace_id===content.workspace_id))return true;
 }
 for(const [key,token]of Object.entries(cookies(req))){
  if(!key.startsWith('st_media_d_'))continue;
  try{
   const p=jwt.verify(token,config.jwtSecret,{algorithms:['HS256'],audience:AUD});
   const d=db.prepare('SELECT id,workspace_id,device_token,blocked FROM devices WHERE id = ?').get(p.sub);
   if(d&&!d.blocked&&d.device_token&&p.workspace===d.workspace_id&&p.binding===binding(d.device_token)&&(!content.workspace_id||content.workspace_id===d.workspace_id))return true;
  }catch{}
 }
 return false;
}
function setViewCookie(req,res,by,device){if(enabled())res.cookie('st_media_v_'+binding(device.id).slice(0,12),JSON.stringify(by),options(req));}
function viewerCanAccess(req,content){
 const {db}=require('../db/database');
 for(const [key,value]of Object.entries(cookies(req))){
  if(!key.startsWith('st_media_v_'))continue;
  try{
   const by=JSON.parse(value);
   if(!by||typeof by!=='object'||(!by.token&&!by.deviceId))continue;
   const r=require('./view-access').resolve(db,req,by);
   if(!r.device||content.workspace_id!==r.device.workspace_id)continue;
   const payload=require('../ws/deviceSocket').buildPlaylistPayload(r.device.id);
   let found=false;
   const walk=(v,depth=0)=>{if(found||depth>20||v==null)return;if(typeof v==='string'){if(v===content.id||v.includes('/api/content/'+content.id+'/')||v.includes('/api/widgets/'+content.id+'/render')||[content.filepath,content.thumbnail_path,content.subtitle_url].filter(Boolean).some(f=>v.includes('/uploads/content/'+f)||v.includes('/fonts/u/'+f)))found=true;return;}if(typeof v!=='object')return;if(v.content_id===content.id||v.widget_id===content.id)found=true;for(const value of Object.values(v))walk(value,depth+1);};
   walk(payload);if(found)return true;
  }catch{}
 }
 return false;
}
function rowsForName(db,name){
 const rows=db.prepare('SELECT * FROM content WHERE filepath = ? OR thumbnail_path = ? OR subtitle_url = ?').all(name,name,name);
 for(const sql of [
  'SELECT c.* FROM content_video_variants v JOIN content c ON c.id = v.content_id WHERE v.filepath = ?',
  'SELECT c.* FROM content_audio_tracks a JOIN content c ON c.id = a.content_id WHERE a.audio_key = ? OR a.caption_key = ?'
 ]){try{rows.push(...db.prepare(sql).all(...(sql.includes('caption_key')?[name,name]:[name])));}catch(e){if(!/no such table/.test(e.message))throw e;}}
 return rows;
}
function guard(req,res,next){
 if(!enabled()||!['GET','HEAD'].includes(req.method))return next();
 let rows;const {db}=require('../db/database');
 if(req.path.startsWith('/uploads/content/')){
  let name;try{name=decodeURIComponent(req.path.slice('/uploads/content/'.length));}catch{return res.status(400).json({error:'Invalid media path'});}
  if(!name||path.basename(name)!==name||name.includes('\\')||name.startsWith('.'))return res.status(404).json({error:'Media not found'});
  rows=rowsForName(db,name);
 }else if(req.path.startsWith('/fonts/u/')){
  const name=req.path.slice('/fonts/u/'.length);
  if(!name||path.basename(name)!==name||name.includes('\\'))return res.status(404).json({error:'Media not found'});
  rows=db.prepare('SELECT * FROM custom_fonts WHERE filepath = ?').all(name);
 }else{
  const m=/^\/api\/content\/([^/]+)\/(file|thumbnail|bundle|variant|sssp3-fit)(?:\/|$)/.exec(req.path);
  const proxy=/^\/media\/proxy\/([^/]+)$/.exec(req.path);
  const widget=/^\/api\/widgets\/([0-9a-f-]{36})\/(render|thumbnail|social\.json|social-media\/[^/]+|bi-image\.png|bi-token|data\.json|queue\.json|telemetry)$/.exec(req.path);
  if(widget)rows=[db.prepare('SELECT * FROM widgets WHERE id = ?').get(widget[1])].filter(Boolean);
  else if(m)rows=[db.prepare('SELECT * FROM content WHERE id = ?').get(m[1])].filter(Boolean);
  else if(proxy)rows=[db.prepare('SELECT c.* FROM content c JOIN playlist_items p ON p.content_id = c.id WHERE p.id = ?').get(proxy[1])].filter(Boolean);
  else return next();
 }
 res.setHeader('Cache-Control','private, no-store');res.vary('Cookie');res.vary('Authorization');
 if(!rows.length)return res.status(404).json({error:'Media not found'});
 if(!rows.some(c=>(process.env.DEPLOYMENT_PROFILE!=='saas-staging'||!!c.workspace_id)&&(userCanAccess(req,c)||deviceCanAccess(req,c)||viewerCanAccess(req,c))))return res.status(403).json({error:'Media authorization required'});
 next();
}
function sessionCookieMiddleware(req,res,next){
 if(!enabled())return next();
 const json=res.json;res.json=function(body){
  // Keep dashboard images usable after the initial ten-minute lease. Only the
  // existing JWT middleware may attest a normal user session; API/device tokens
  // and recovery/support sessions never mint a dashboard cookie here.
  const header=/^Bearer (.+)$/.exec(req.headers.authorization||'');
  if(req.sessionKind==='user'&&req.user&&header)setUserCookie(req,res,header[1]);
  else if(String(req.originalUrl||'').startsWith('/api/auth/')&&body&&typeof body.token==='string'){
   try{const s=require('../middleware/auth').resolveSessionUser(body.token);if(!s.viaRecovery&&!s.viaSupport)res.cookie('st_media_user',body.token,options(req));}catch{}
  }
  return json.call(this,body);
 };next();
}
module.exports={enabled,setDeviceCookie,setUserCookie,setViewCookie,userCanAccess,deviceCanAccess,viewerCanAccess,guard,sessionCookieMiddleware,TTL};
