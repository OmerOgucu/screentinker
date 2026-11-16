(function (root) {
  'use strict';
  function clean(value, depth) {
    depth = depth || 0;
    if (depth > 5) return '[omitted]';
    if (typeof value === 'string') return value.replace(/([?&](?:k|key|token|device_token|secret|password)=)[^&#\s]+/gi, '$1[redacted]').replace(/Bearer\s+[A-Za-z0-9_.~+\/-]+/gi, 'Bearer [redacted]');
    if (value && typeof value === 'object') {
      if (value instanceof Error) return clean(value.message, depth + 1);
      var out = Array.isArray(value) ? [] : {};
      for (var k in value) if (Object.prototype.hasOwnProperty.call(value, k)) out[k] = /token|secret|password|authorization|enrolkey/i.test(k) ? '[redacted]' : clean(value[k], depth + 1);
      return out;
    }
    return value;
  }
  if (typeof module === 'object' && module.exports) module.exports = clean;
  if (!root.console || root.console.__stRedacted) return;
  ['log', 'warn', 'error', 'info', 'debug'].forEach(function (key) {
    var original = root.console[key];
    if (typeof original !== 'function') return;
    root.console[key] = function () { var args = []; for (var i = 0; i < arguments.length; i++) args.push(clean(arguments[i])); original.apply(root.console, args); };
  });
  root.console.__stRedacted = true;
}(typeof window !== 'undefined' ? window : this));
