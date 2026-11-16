'use strict';
const fs = require('node:fs');
const path = require('node:path');
function shellManifest(legacy = false) {
  const entry = legacy ? '/player/legacy' : '/player';
  const html = fs.readFileSync(path.join(__dirname, '../player', legacy ? 'legacy.html' : 'index.html'), 'utf8');
  const assets = [entry];
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) {
    if (match[1].startsWith('/player/') || match[1] === '/socket.io/socket.io.js') assets.push(match[1]);
  }
  return { version: require('../version'), legacy, assets: [...new Set(assets)] };
}
module.exports = { shellManifest };
