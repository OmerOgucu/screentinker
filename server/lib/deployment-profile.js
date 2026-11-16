'use strict';
// An explicit staging contract. Legacy self-hosted installations keep their defaults.
const fs = require('node:fs');
function validateDeployment(env = process.env) {
  const profile = env.DEPLOYMENT_PROFILE || 'self-hosted';
  if (!['self-hosted', 'saas-staging'].includes(profile)) throw new Error('Unknown DEPLOYMENT_PROFILE');
  if (profile !== 'saas-staging') return;
  const required = {
    NODE_ENV: 'production', MEDIA_REQUIRE_AUTH: 'true', DISABLE_REGISTRATION: 'true',
    ST_SKIP_DEP_PREFLIGHT: '1', PLUGINS_ENABLED: 'false', OTA_ENABLED: 'false',
    LIVE_VIDEO_ENABLED: 'false', TALK_ENABLED: 'false', SELF_HOSTED: 'true',
  };
  for (const [name, value] of Object.entries(required)) {
    if (env[name] !== value) throw new Error(`saas-staging requires ${name}=${value}`);
  }
  for (const name of ['SITE_CACHE_FOR', 'UPDATER_URL', 'GO2RTC_URL', 'JWT_SECRET']) {
    if (env[name]) throw new Error(`saas-staging does not permit ${name}`);
  }
  if (!env.DATA_DIR || !env.DATA_DIR.startsWith('/')) throw new Error('saas-staging requires an absolute DATA_DIR');
  let url;
  try { url = new URL(env.APP_URL); } catch { throw new Error('saas-staging requires APP_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('saas-staging APP_URL must be an HTTPS origin');
  }
  // Explicit configuration is mandatory: an empty list intentionally trusts no proxy.
  if (env.TRUSTED_PROXY_CIDRS === undefined) throw new Error('saas-staging requires explicit TRUSTED_PROXY_CIDRS');
  const entries = env.TRUSTED_PROXY_CIDRS.split(',').map(x => x.trim()).filter(Boolean);
  const net = require('node:net');
  for (const entry of entries) {
    const [ip, bits, extra] = entry.split('/');
    const family = net.isIP(ip), width = family === 4 ? 32 : 128;
    if (!family || extra !== undefined || (bits !== undefined && (!/^\d+$/.test(bits) || Number(bits) !== width))) {
      throw new Error('saas-staging trusts individual proxy IPs only (/32 or /128)');
    }
  }
  if (!env.JWT_SECRET_FILE) throw new Error('saas-staging requires JWT_SECRET_FILE');
  let secret;
  try { secret = fs.readFileSync(env.JWT_SECRET_FILE, 'utf8').trim(); } catch { throw new Error('Cannot read JWT_SECRET_FILE'); }
  if (secret.length < 48 || /^(changeme|set-a-long-random-string|secret)/i.test(secret)) throw new Error('JWT_SECRET_FILE must hold at least 48 non-placeholder characters');
}
module.exports = { validateDeployment };
