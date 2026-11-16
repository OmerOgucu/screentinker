/* ES5 header-only authentication for app:// download requests. Never use on foreign URLs. */
(function (root) {
  'use strict';
  var provider = function () { return null; };
  function headers(url) {
    var c = provider();
    if (!c || !c.deviceId || !c.deviceToken || !c.serverUrl) return {};
    var base = String(c.serverUrl).replace(/\/+$/, '');
    // Exact origin prefix, followed by a private media path; no protocol-relative or redirect target.
    if (String(url).indexOf(base + '/') !== 0 || !/^\/(api\/content\/|uploads\/content\/|fonts\/u\/)/.test(String(url).slice(base.length))) return {};
    return { Authorization: 'Bearer ' + c.deviceToken, 'X-ST-Device-Id': c.deviceId };
  }
  function apply(xhr, url) { var h = headers(url); for (var k in h) if (Object.prototype.hasOwnProperty.call(h, k)) xhr.setRequestHeader(k, h[k]); }
  root.STMediaAuth = { configure: function (fn) { provider = fn; }, headers: headers, apply: apply };
  if (typeof module === 'object' && module.exports) module.exports = root.STMediaAuth;
}(typeof window !== 'undefined' ? window : this));
