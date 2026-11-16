#!/usr/bin/env node
'use strict';
// Run inside the final production image. Keep package notices with the artifact actually shipped.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const server=path.join(__dirname,'../server'),out=process.argv[2];
if(!out)throw Error('Pass an output directory');fs.mkdirSync(out,{recursive:true});
let listing;try{listing=cp.execFileSync('npm',['ls','--omit=dev','--all','--parseable'],{cwd:server,encoding:'utf8',maxBuffer:64*1024*1024});}catch(e){listing=e.stdout;if(!listing)throw e;}
const seen=new Set(),inventory=[],parts=['THIRD-PARTY NOTICES — installed production npm packages','This inventory does not cover the base OS, ffmpeg, fonts or separate native player packages.'];
for(const dir of listing.trim().split('\n')){
 let pkg;try{pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));}catch{continue;}
 const key=pkg.name+'@'+pkg.version;if(seen.has(key))continue;seen.add(key);
 const files=fs.readdirSync(dir).filter(n=>/^(LICEN[CS]E|NOTICE|COPYING)([.-].*)?$/i.test(n)&&fs.statSync(path.join(dir,n)).isFile());
 if(dir===server)for(const n of ['../LICENSE','../NOTICE'])if(fs.existsSync(path.join(dir,n)))files.push(n);
 const license=typeof pkg.license==='string'?pkg.license:pkg.license?.type||(Array.isArray(pkg.licenses)?pkg.licenses.map(x=>x.type||x).join(' OR '):null);
 const category=/AGPL/i.test(license||'')?'AGPL':/LGPL/i.test(license||'')?'LGPL':/(^|[^L])GPL/i.test(license||'')?'GPL':/MIT/.test(license||'')?'MIT':license?'OTHER':'UNRESOLVED';
 inventory.push({name:pkg.name,version:pkg.version,license,category,noticeFiles:files});
 parts.push('\n'+'='.repeat(72)+'\n'+key+'\nDeclared license: '+(license||'not declared'));
 for(const file of files)parts.push('\n--- '+file+' ---\n'+fs.readFileSync(path.join(dir,file),'utf8'));
}
fs.writeFileSync(path.join(out,'production-license-inventory.json'),JSON.stringify(inventory,null,2));
fs.writeFileSync(path.join(out,'THIRD-PARTY-NOTICES.txt'),parts.join('\n')+'\n');
console.log('Recorded '+inventory.length+' installed production packages; review unresolved/missing license files separately.');
