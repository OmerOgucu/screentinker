#!/bin/sh
set -eu
umask 077
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
envfile=${1:?Pass the staging env file}
out=${2:?Pass a NEW absolute backup directory}
case "$out" in /*) ;; *) echo 'Backup directory must be absolute' >&2; exit 1;; esac
test ! -e "$out" || { echo 'Refusing to overwrite a backup' >&2; exit 1; }
compose() { docker compose --env-file "$envfile" -f "$root/docker-compose.staging.yml" "$@"; }
cid=$(compose ps -aq app)
test -n "$cid" || { echo 'No staging app container' >&2; exit 1; }
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$cid" | grep -qx 'DEPLOYMENT_PROFILE=saas-staging' || { echo 'Refusing a non-staging container' >&2; exit 1; }
volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$cid")
image=$(docker inspect --format '{{.Image}}' "$cid")
state=$(sed -n 's/^STAGING_STATE_DIR=//p' "$envfile")
test -n "$volume" && test -d "$state"
running=$(docker inspect --format '{{.State.Running}}' "$cid")
mkdir -m 700 "$out"
# The app owns its data as uid 1000; the short-lived tar process needs no capabilities.
chown 1000:1000 "$out"
trap 'if [ "$running" = true ]; then compose start app >/dev/null; fi' EXIT HUP INT TERM
compose stop app >/dev/null
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 1000:1000 --entrypoint tar --mount "type=volume,src=$volume,dst=/data,readonly" --mount "type=bind,src=$out,dst=/backup" "$image" -czpf /backup/data.tar.gz -C /data .
tar -czpf "$out/config.tar.gz" -C "$state" .
printf '%s\n' "$image" > "$out/image-id.txt"
(cd "$out" && sha256sum data.tar.gz config.tar.gz image-id.txt > SHA256SUMS)
echo 'Consistent stopped-app backup complete; archives contain secrets and must stay private.'
