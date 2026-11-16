'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const auth=require('../../tizen/js/media-auth');
const clean=require('../player/log-redaction');
test('Tizen adds header credentials to its own private media only',()=>{auth.configure(()=>({serverUrl:'https://origin.test',deviceId:'fixture-id',deviceToken:'fixture-secret'}));assert.equal(auth.headers('https://origin.test/api/content/a/file').Authorization,'Bearer fixture-secret');for(const url of ['https://evil.test/api/content/a/file','https://origin.test.evil/api/content/a/file','https://origin.test/api/status','//origin.test/uploads/content/a'])assert.deepEqual(auth.headers(url),{});});
test('Tizen XHR applies credentials without placing them in the URL',()=>{const headers={};auth.apply({setRequestHeader:(k,v)=>headers[k]=v},'https://origin.test/uploads/content/a.mp4');assert.equal(headers['X-ST-Device-Id'],'fixture-id');assert.equal(headers.Authorization,'Bearer fixture-secret');});
test('player logs scrub display keys, bearer credentials and nested tokens',()=>{const s=clean({url:'https://screen.test/player?k=private-value&safe=1',deviceToken:'private-value',nested:{Authorization:'Bearer fixture'}});assert.equal(s.deviceToken,'[redacted]');assert.ok(!JSON.stringify(s).includes('private-value'));assert.equal(clean('Bearer fixture-token'),'Bearer [redacted]');});
