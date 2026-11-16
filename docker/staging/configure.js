#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const [hostname,allowRaw,outArg]=process.argv.slice(2);
if(!hostname||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname))throw Error('Pass a DNS hostname, an allowlist and an output directory');
const allow=String(allowRaw||'').split(',').filter(Boolean);
if(!allow.length)throw Error('An explicit IP/CIDR allowlist is required');
for(const x of allow){const [ip,bits,extra]=x.split('/'),f=net.isIP(ip);if(!f||extra!==undefined||(bits!==undefined&&(!/^\d+$/.test(bits)||Number(bits)<1||Number(bits)>(f===4?32:128))))throw Error('Invalid allowlist');}
const out=path.resolve(outArg||'.local/staging');
fs.mkdirSync(out,{recursive:true,mode:0o700});fs.mkdirSync(path.join(out,'secrets'),{recursive:true,mode:0o700});fs.mkdirSync(path.join(out,'tls'),{recursive:true,mode:0o700});
const secret=path.join(out,'secrets/jwt_secret');if(!fs.existsSync(secret))fs.writeFileSync(secret,crypto.randomBytes(48).toString('hex')+'\n',{mode:0o400,flag:'wx'});
if(process.platform!=='win32'&&process.getuid()===0){fs.chownSync(secret,1000,1000);fs.chownSync(path.join(out,'tls'),101,101);}
const template=fs.readFileSync(path.join(__dirname,'nginx.conf.template'),'utf8');
fs.writeFileSync(path.join(out,'nginx.conf'),template.replace('__HOSTNAME__',hostname).replace('__ALLOWLIST__',allow.map(x=>'allow '+x+';').join('\n    ')));
const hostPath=process.env.STAGING_STATE_HOST_PATH||out;
if(!hostPath.startsWith('/')||/[\r\n]/.test(hostPath))throw Error('STAGING_STATE_HOST_PATH must be an absolute Linux path');
fs.writeFileSync(path.join(out,'staging.env'),['STAGING_PROJECT_NAME=screentinker-staging','STAGING_TAG=local-reviewed','STAGING_HOSTNAME='+hostname,'STAGING_STATE_DIR='+hostPath,'STAGING_TLS_PORT=8443'].join('\n')+'\n',{mode:0o600});
console.log('Configuration written. Supply TLS files and verify secret/certificate ownership before starting.');
