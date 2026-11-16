#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
envfile=${1:?Pass the env file for a NEW isolated restore project}
backup=${2:?Pass the backup directory}
(cd "$backup" && sha256sum -c SHA256SUMS >/dev/null)
compose() { docker compose --env-file "$envfile" -f "$root/docker-compose.staging.yml" "$@"; }
cid=$(compose ps -aq app)
test -n "$cid" || { echo 'Create the restore app container first; do not start it' >&2; exit 1; }
test "$(docker inspect --format '{{.State.Running}}' "$cid")" = false || { echo 'Refusing a running restore target' >&2; exit 1; }
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$cid" | grep -qx 'DEPLOYMENT_PROFILE=saas-staging' || exit 1
volume=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$cid")
image=$(cat "$backup/image-id.txt")
printf '%s\n' "$image" | grep -Eq '^sha256:[a-f0-9]{64}$' || { echo 'Invalid backup image ID' >&2; exit 1; }
test "$(docker inspect --format '{{.Image}}' "$cid")" = "$image" || { echo 'Restore target must use the exact backup image' >&2; exit 1; }
test -n "$volume"
docker run --rm --network none --read-only --cap-drop ALL --user 1000:1000 --entrypoint sh --mount "type=volume,src=$volume,dst=/data" "$image" -c 'test -z "$(find /data -mindepth 1 -print -quit)"' || { echo 'Refusing a nonempty data volume' >&2; exit 1; }
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 1000:1000 --entrypoint tar --mount "type=volume,src=$volume,dst=/data" --mount "type=bind,src=$backup,dst=/backup,readonly" "$image" --no-same-owner -xzpf /backup/data.tar.gz -C /data
echo 'Data restored into an EMPTY volume. Install the matching config/secret securely, then start and verify.'
