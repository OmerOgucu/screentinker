// Cloudflare published edge IP ranges.
// Source: https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6
// Snapshot: 2026-05-07. Update by hand when Cloudflare publishes a new list.
const cloudflareIpv4 = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

const cloudflareIpv6 = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

const cloudflareIps = [...cloudflareIpv4, ...cloudflareIpv6];

// A private or loopback TCP peer is not proof of a reverse proxy. A direct LAN client
// can supply X-Forwarded-For itself. Local proxies must be listed explicitly; an empty
// value trusts nobody. Keep the published Cloudflare edges as the existing default.
function parseTrustedProxies(raw = process.env.TRUSTED_PROXY_CIDRS) {
  if (raw === undefined) return [...cloudflareIps];
  const entries = String(raw).split(',').map(s => s.trim()).filter(Boolean);
  const net = require('net');
  for (const entry of entries) {
    const parts = entry.split('/');
    const family = net.isIP(parts[0]);
    const bits = parts[1] === undefined ? null : Number(parts[1]);
    if (!family || parts.length > 2 || (bits !== null &&
        (!/^\d+$/.test(parts[1]) || bits < 0 || bits > (family === 4 ? 32 : 128)))) {
      throw new Error('TRUSTED_PROXY_CIDRS must contain only comma-separated IP addresses or CIDRs');
    }
  }
  return entries;
}
const trustedProxies = parseTrustedProxies();

module.exports = { cloudflareIpv4, cloudflareIpv6, cloudflareIps, trustedProxies, parseTrustedProxies };
