# İzole Linux staging kurulumu

Bu profil test içindir. Bu çalışma sırasında VPS'e bağlanılmadı, DNS/firewall değiştirilmedi ve internet yayını açılmadı. Docker Engine/Compose, ayrı bir Alpine Linux VM'de temiz veri volume'üyle sınandı. Ubuntu VPS üzerinde aynı kurulum **henüz çalıştırılmadı**.

## Ön koşullar

Ubuntu 24.04/26.04 LTS veya uygun Linux; mevcut Docker Engine ve Compose plugin; en az 2 CPU, 4 GB RAM ve derleme/yedek alanı. Kurulumdan önce mevcut container, ağ, port ve disk envanterini alın:

```sh
docker version
docker compose version
docker ps -a
docker network ls
ss -lntp
df -h
```

Başka projelerin Docker paketlerini kaldırmayın, daemon'unu yeniden başlatmayın, `docker system prune` kullanmayın. Docker yoksa [resmi Ubuntu kurulumunu](https://docs.docker.com/engine/install/ubuntu/) ayrı bakım planıyla değerlendirin; buradaki test daemon'u Windows Docker Desktop'ı başlatmadan kurulmuştur.

## Proje ve yapılandırma

Kendi fork'unuzun onaylanmış commit'ini ayrı dizine alın. Bu çalışma dalı `local/production-hardening-20261116`; GitHub'a henüz push yapılmadığından uzaktan bu dalı çekmek mümkün olmayabilir. Önce yerel commit/patch aktarımını onaylayın. Proje kökünde:

```sh
git status --short
git rev-parse HEAD
mkdir -p .local/staging
```

Mevcut Node varsa:

```sh
sudo node docker/staging/configure.js staging.example.com 127.0.0.1/32 "$PWD/.local/staging"
```

Sistem genelinde Node kurmadan, aynı işi resmi Node image'iyle yapmak için:

```sh
sudo docker run --rm --network none \
  -e STAGING_STATE_HOST_PATH="$PWD/.local/staging" \
  --mount "type=bind,src=$PWD,dst=/work" -w /work \
  node:22-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da \
  node docker/staging/configure.js staging.example.com 127.0.0.1/32 /work/.local/staging
```

Bu komut rastgele JWT secret üretir, mevcut secret'ı değiştirmez. Nginx allowlist'i gerçek proxy TCP peer'lerini kapsamalıdır. Docker localhost/SSH tünel erişiminde peer bir Docker gateway adresi olabilir; bu durumda yalnız o adresi `/32` olarak tanımlayın. Uzak adresi tahmin edip geniş bir private ağı açmayın. Test VM'sinde QEMU peer'i `10.0.2.2/32` kullanıldı; bunu VPS'e kopyalamayın.

`staging.env` içindeki proje adı, tag, subnet/IP ve TLS portunu kontrol edin. Varsayılan `172.30.240.0/24` başka ağlarla çakışmamalı; proxy `.2`, app `.3`. Subnet değişirse üç ayarı birlikte düzenleyin. Diğer Compose projelerinin ağlarını değiştirmeyin.

## TLS ve erişim

Geçerli sertifikanın `fullchain.pem` ve `privkey.pem` dosyalarını `.local/staging/tls/` altına güvenle kopyalayın. Nginx UID 101 ile okur:

```sh
sudo chown 101:101 .local/staging/tls .local/staging/tls/*.pem
sudo chmod 700 .local/staging/tls
sudo chmod 400 .local/staging/tls/privkey.pem
sudo chmod 444 .local/staging/tls/fullchain.pem
sudo chown 1000:1000 .local/staging/secrets/jwt_secret
sudo chmod 400 .local/staging/secrets/jwt_secret
```

Varsayılan port yalnız `127.0.0.1:8443` üzerindedir. VPN/SSH tüneli gibi yetkili erişim kullanın; backend 3001 host'a yayınlanmaz. Let's Encrypt için DNS-01, HTTP servisi açmadan sertifika almayı sağlayabilir; [resmi açıklama](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge). Gerçek DNS-01/yenileme bu çalışmada denenmedi. Testte self-signed CA açıkça güvenilen CLI istemcisiyle TLS doğrulandı; browser sertifika uyarısı atlanmadı.

## Derle ve başlat

```sh
sudo docker compose --env-file .local/staging/staging.env -f docker-compose.staging.yml config --quiet
sudo docker compose --env-file .local/staging/staging.env -f docker-compose.staging.yml build app
sudo docker compose --env-file .local/staging/staging.env -f docker-compose.staging.yml up -d --wait --wait-timeout 120
sudo docker compose --env-file .local/staging/staging.env -f docker-compose.staging.yml ps
```

İlk yönetici yalnız izinli erişim üzerinden kurulmalı. İlk boş DB'de bootstrap kayıt mümkündür; ilk hesaptan sonra genel kayıt kapalıdır. Gerçek müşteri verisi kullanmayın. Secret'ı konsola yazmayın veya Compose'a sabit değer olarak eklemeyin.

Test VM'sinde browser QA için ayrıca yalnız VM içinde bir HTTP override kullanıldı; host erişimi yine localhost'a forward edildi. Bu override staging paketinin parçası değildir ve VPS'e taşınmamalıdır. Normal paket yalnız TLS dinler.

## Durdur ve güncelle

```sh
sudo docker compose --env-file .local/staging/staging.env -f docker-compose.staging.yml stop
```

Volume silen `down -v` kullanmayın. Güncellemeden önce [yedek alın](BACKUP-RESTORE.md), yeni commit'i yeni image tag'iyle derleyin; readiness/negatif erişim/restore kontrollerini tekrarlayın. Eski image ID/tag ve secret'ı rollback için koruyun. Otomatik updater ve Docker socket mount'u bu profilde yoktur.
