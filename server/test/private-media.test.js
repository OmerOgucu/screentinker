'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');
const {freePort}=require('./helpers/free-port');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'st-private-media-'));
let child,base,A,B,content,unused,device,deviceToken,cookie,viewCookie,db;
const password='Fixture-only-'+crypto.randomBytes(12).toString('hex');
const secret=crypto.randomBytes(48).toString('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function req(p,{method='GET',body,token,headers={}}={}){
 const r=await fetch(base+p,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return{status:r.status,data,headers:r.headers};
}
async function upload(name){const f=new FormData();f.append('file',new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>'],{type:'image/svg+xml'}),name+'.svg');const r=await req('/api/content',{method:'POST',body:f,token:A});assert.equal(r.status,201);return r.data;}
before(async()=>{
 const port=await freePort();base='http://127.0.0.1:'+port;
 const fd=fs.openSync(path.join(tmp,'server.log'),'w');
 child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'test',SELF_HOSTED:'true',DISABLE_REGISTRATION:'false',ST_SKIP_DEP_PREFLIGHT:'1',ST_SQLITE_DRIVER:'node',DATA_DIR:tmp,JWT_SECRET:secret,MEDIA_REQUIRE_AUTH:'true',TRUSTED_PROXY_CIDRS:'',PORT:String(port)},stdio:['ignore',fd,fd]});fs.closeSync(fd);
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/api/status')).ok){ready=true;break;}}catch{}await pause(200);}assert.ok(ready,'server starts');
 A=(await req('/api/auth/register',{method:'POST',body:{email:'a@private.test',password,name:'A',createOrg:true}})).data.token;
 B=(await req('/api/auth/register',{method:'POST',body:{email:'b@private.test',password,name:'B',createOrg:true}})).data.token;
 assert.ok(A&&B);content=await upload('assigned');unused=await upload('unassigned');
 const p=(await req('/api/playlists',{method:'POST',body:{name:'private fixture'},token:A})).data;
 await req('/api/playlists/'+p.id+'/items',{method:'POST',body:{content_id:content.id,duration_sec:30},token:A});await req('/api/playlists/'+p.id+'/publish',{method:'POST',body:{},token:A});
 device=(await req('/api/devices/web-player',{method:'POST',body:{name:'private-device'},token:A})).data.device;
 await req('/api/playlists/'+p.id+'/assign',{method:'POST',body:{device_id:device.id},token:A});
 db=new DatabaseSync(path.join(tmp,'db/remote_display.db'));deviceToken=db.prepare('SELECT device_token FROM devices WHERE id = ?').get(device.id).device_token;
 const grant=await req('/api/player/media-session',{method:'POST',token:deviceToken,body:{device_id:device.id}});assert.equal(grant.status,200);cookie=grant.headers.get('set-cookie').split(';')[0];
 const v=await req('/api/devices/'+device.id+'/view',{method:'PUT',body:{enabled:true},token:A});
 // Read the operator's link from the authenticated API rather than decrypting instance secrets.
 const url=v.data.share_url;
 if(url){const page=await req(new URL(url,base).pathname);viewCookie=page.headers.get('set-cookie')?.split(';')[0];}
});
after(async()=>{db?.close();if(child&&!child.killed){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),pause(5000)]);if(child.exitCode===null)child.kill('SIGKILL');}});
test('a published assignment does not make its raw media URL public',async()=>{assert.equal((await req('/uploads/content/'+content.filepath)).status,403);assert.equal((await req('/api/content/'+content.id+'/file')).status,403);assert.equal((await req('/api/content/'+content.id+'/thumbnail')).status,403);});
test('workspace user can read and another workspace cannot',async()=>{assert.equal((await req('/uploads/content/'+content.filepath,{token:A})).status,200);assert.equal((await req('/uploads/content/'+content.filepath,{token:B})).status,403);assert.equal((await req('/api/content/'+content.id+'/file',{token:B})).status,403);});
test('device media lease is HttpOnly, short-lived, and supports a stable URL',async()=>{const g=await req('/api/player/media-session',{method:'POST',token:deviceToken,body:{device_id:device.id}});assert.equal(g.status,200);assert.match(g.headers.get('set-cookie'),/HttpOnly/i);assert.equal(g.data.expires_in,600);const r=await req('/uploads/content/'+content.filepath,{headers:{Cookie:cookie}});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.match(r.headers.get('vary'),/Cookie/);});
test('range and HEAD keep their semantics behind authorization',async()=>{assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:cookie,Range:'bytes=0-9'}})).status,206);assert.equal((await req('/uploads/content/'+content.filepath,{method:'HEAD',headers:{Cookie:cookie}})).status,200);assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Range:'bytes=0-9'}})).status,403);});
test('native HTTP token pair is accepted without a browser cookie',async()=>{assert.equal((await req('/uploads/content/'+content.filepath,{token:deviceToken,headers:{'X-ST-Device-Id':device.id}})).status,200);assert.equal((await req('/uploads/content/'+content.filepath,{token:'wrong',headers:{'X-ST-Device-Id':device.id}})).status,403);});
test('blocking a device revokes an already issued lease immediately',async()=>{db.prepare('UPDATE devices SET blocked = 1 WHERE id = ?').run(device.id);try{assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:cookie}})).status,403);}finally{db.prepare('UPDATE devices SET blocked = 0 WHERE id = ?').run(device.id);}});
test('a forged or malformed cookie is refused',async()=>{assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:cookie+'tampered'}})).status,403);assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:'st_media_d_bad=%zz'}})).status,403);});
test('an expired grant cannot download fresh bytes',async()=>{const d=db.prepare('SELECT workspace_id FROM devices WHERE id = ?').get(device.id);const token=require('jsonwebtoken').sign({workspace:d.workspace_id,binding:crypto.createHash('sha256').update(deviceToken).digest('hex')},secret,{algorithm:'HS256',audience:'st:media',subject:device.id,expiresIn:-1});const expired=cookie.slice(0,cookie.indexOf('=')+1)+token;assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:expired}})).status,403);});
test('moving the device to another workspace revokes its old lease',async()=>{const before=db.prepare('SELECT workspace_id FROM devices WHERE id = ?').get(device.id).workspace_id;const other=db.prepare("SELECT workspace_id FROM workspace_members WHERE user_id = (SELECT id FROM users WHERE email = 'b@private.test') LIMIT 1").get().workspace_id;db.prepare('UPDATE devices SET workspace_id = ? WHERE id = ?').run(other,device.id);try{assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:cookie}})).status,403);}finally{db.prepare('UPDATE devices SET workspace_id = ? WHERE id = ?').run(before,device.id);}});
test('media session endpoint does not mint grants for a bad device credential',async()=>{assert.equal((await req('/api/player/media-session',{method:'POST',token:'wrong',body:{device_id:device.id}})).status,401);});
test('authenticated preview obtains a media cookie without weakening write API auth',async()=>{const g=await req('/api/player/media-user-session',{method:'POST',token:A});assert.equal(g.status,200);const uc=g.headers.get('set-cookie').split(';')[0];assert.equal((await req('/uploads/content/'+unused.filepath,{headers:{Cookie:uc}})).status,200);assert.equal((await req('/api/playlists',{method:'POST',body:{name:'must refuse'},headers:{Cookie:uc}})).status,401);});
test('an authenticated dashboard request renews its media lease',async()=>{const r=await req('/api/auth/me',{token:A});assert.equal(r.status,200);const c=r.headers.get('set-cookie');assert.ok(c);assert.match(c,/st_media_user=/);assert.match(c,/Max-Age=600/);assert.equal((await req('/uploads/content/'+unused.filepath,{headers:{Cookie:c.split(';')[0]}})).status,200);});
test('normal dashboard login issues an HttpOnly media cookie',async()=>{const r=await req('/api/auth/login',{method:'POST',body:{email:'a@private.test',password}});assert.equal(r.status,200);const c=r.headers.get('set-cookie');assert.ok(c);assert.match(c,/st_media_user=/);assert.match(c,/HttpOnly/);});
test('explicit public share remains scoped to the display and can be revoked',async()=>{assert.ok(viewCookie,'share API returns a link');assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:viewCookie}})).status,200);assert.equal((await req('/uploads/content/'+unused.filepath,{headers:{Cookie:viewCookie}})).status,403);await req('/api/devices/'+device.id+'/view',{method:'PUT',body:{enabled:false},token:A});assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:viewCookie}})).status,403);});
test('device token rotation invalidates an existing media lease',async()=>{db.prepare('UPDATE devices SET device_token = ? WHERE id = ?').run(crypto.randomBytes(32).toString('hex'),device.id);assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:cookie}})).status,403);});

test('uploaded fonts are private and retain workspace isolation',async()=>{
 const u=db.prepare("SELECT id FROM users WHERE email='a@private.test'").get(),d=db.prepare('SELECT workspace_id FROM devices WHERE id=?').get(device.id);
 const id=crypto.randomUUID(),name=id+'.woff2';fs.mkdirSync(path.join(tmp,'uploads/fonts'),{recursive:true});fs.writeFileSync(path.join(tmp,'uploads/fonts',name),'font fixture');
 db.prepare('INSERT INTO custom_fonts (id,workspace_id,uploaded_by,name,css_family,filepath,format,file_size,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id,d.workspace_id,u.id,'Fixture','Fixture',name,'woff2',12,Math.floor(Date.now()/1000));
 const url='/fonts/u/'+name;assert.equal((await req(url)).status,403);assert.equal((await req(url,{token:B})).status,403);const r=await req(url,{token:A});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('widget renders and data do not become public by knowing their UUID',async()=>{
 const r=await req('/api/widgets',{method:'POST',token:A,body:{name:'Private clock',widget_type:'clock',config:{}}});assert.equal(r.status,201);
 const url='/api/widgets/'+r.data.id+'/render';assert.equal((await req(url)).status,403);assert.equal((await req(url,{token:B})).status,403);assert.equal((await req(url,{token:A})).status,200);
 assert.equal((await req('/api/widgets/'+r.data.id+'/data.json')).status,403);
});
test('revoking the user session also revokes its media cookie',async()=>{const r=await req('/api/player/media-user-session',{method:'POST',token:A});const uc=r.headers.get('set-cookie').split(';')[0];db.prepare("UPDATE users SET token_version = token_version + 1 WHERE email = 'a@private.test'").run();assert.equal((await req('/uploads/content/'+content.filepath,{headers:{Cookie:uc}})).status,403);});

test('changing forged forwarded addresses does not bypass the real login rate limit',async()=>{
 let last;
 for(let n=0;n<11;n++)last=await req('/api/auth/login',{method:'POST',body:{email:'missing@proxy.test',password:'incorrect'},headers:{'X-Forwarded-For':'203.0.113.'+(n+1),'CF-Connecting-IP':'198.51.100.'+(n+1)}});
 assert.equal(last.status,429);
});
test('failed-login audit attribution records the direct TCP peer rather than forged headers',()=>{
 const rows=db.prepare("SELECT ip_address FROM activity_log WHERE action = 'auth:login_failed'").all();
 assert.ok(rows.length>0);
 for(const row of rows)assert.match(row.ip_address,/^(127\.0\.0\.1|::ffff:127\.0\.0\.1|::1)$/);
});
