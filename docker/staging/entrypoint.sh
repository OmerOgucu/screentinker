#!/bin/sh
set -eu
umask 077
if [ "${DEPLOYMENT_PROFILE:-}" != saas-staging ]; then
  echo 'Staging image requires DEPLOYMENT_PROFILE=saas-staging' >&2
  exit 1
fi
test -w /data || { echo 'The data volume must be writable by uid 1000' >&2; exit 1; }
exec node server.js
