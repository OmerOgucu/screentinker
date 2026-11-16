'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function check(profile,workspace,kind){
 const context={module:{exports:{}},process:{env:{MEDIA_REQUIRE_AUTH:'true',DEPLOYMENT_PROFILE:profile}},require(name){if(name==='crypto'||name==='path')return require(name);if(name==='jsonwebtoken')return {};if(name==='../config')return {};if(name==='../db/database')return {db:{prepare:()=>({all:()=>[{id:'fixture',workspace_id:workspace}]})}};throw Error('Unexpected dependency '+name);}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../lib/private-media.js'),'utf8'),context);
 let calls=0;for(const name of ['userCanAccess','deviceCanAccess','viewerCanAccess'])context[name]=()=>{calls++;return name===kind;};
 let status=200,next=false;const res={setHeader(){},vary(){},status(n){status=n;return this;},json(){}};
 context.module.exports.guard({method:'GET',path:'/uploads/content/fixture.svg'},res,()=>{next=true;});return{status,next,calls};
}
test('staging rejects ownerless private media before consulting any credential type',()=>{for(const kind of ['userCanAccess','deviceCanAccess','viewerCanAccess'])assert.deepEqual(check('saas-staging',null,kind),{status:403,next:false,calls:0});});
test('staging keeps workspace-owned media available to an authorized principal',()=>{assert.equal(check('saas-staging','workspace-a','deviceCanAccess').next,true);});
test('legacy self-hosted ownerless behavior remains compatible',()=>{assert.equal(check('self-hosted',null,'userCanAccess').next,true);});
