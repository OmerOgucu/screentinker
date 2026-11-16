# Tutarlı yedek ve izole geri yükleme

JWT secret ve DB birlikte korunmalıdır. Canlı SQLite dosyasını veya çalışan VM diskini tek başına kopyalamayın. Yedekler sır içerir; Git'e alınmaz. Bu araçlar yalnız staging container etiketi/profili ve ilgili `/data` volume'ünü kullanır.

## Yedek

Repo kökünde, Linux'ta yeni ve mutlak hedef dizin verin:

```sh
sudo sh docker/staging/backup.sh "$PWD/.local/staging/staging.env" "$PWD/backups/20261116-001"
sudo ls -l backups/20261116-001
```

Script çalışan app'ı durdurur; `/data`yı UID 1000 ile, network/capability olmadan arşivler. Config/TLS/JWT dosyalarını ayrı `config.tar.gz` içine alır; image ID ve SHA256SUMS yazar. App daha önce çalışıyorsa sonunda aynı container'ı başlatır. Hedef varsa üzerine yazmaz. Proxy bu kısa aralıkta 502 verebilir; bakım penceresi planlayın. Daha önce durmuş app kendiliğinden başlatılmaz.

```sh
cd backups/20261116-001
sudo sha256sum -c SHA256SUMS
```

Yedeğin bu makinede kalması off-site/disaster-recovery değildir. Şifreli ayrı depoya aktarım, erişim/retention ve restore sıklığı ayrıca tasarlanmalı; bu oturumda dışarı yedek gönderilmedi.

## Yeni projeye restore

Mevcut volume'e restore yapılmaz. Yeni state dizini ve benzersiz Compose proje adı kullanın. Yalnız kendi ürettiğiniz, hash'i doğrulanmış arşivi açın. Config arşivi de sır içerir:

```sh
sudo install -d -m 700 .local/restore-drill
sudo tar -xzpf backups/20261116-001/config.tar.gz -C .local/restore-drill
```

Yeni `staging.env` içinde `STAGING_PROJECT_NAME`, `STAGING_STATE_DIR`, gerekirse TLS portu ve çakışmayan subnet/proxy/app IP'lerini değiştirin. Aynı JWT secret'ı koruyun; Nginx allowlist/upstream yapılandırmasını doğrulayın. Yeni volume oluşturmak için app'ı **başlatmadan** create yapın:

```sh
sudo docker compose --env-file .local/restore-drill/staging.env -f docker-compose.staging.yml create app
sudo sh docker/staging/restore.sh "$PWD/.local/restore-drill/staging.env" "$PWD/backups/20261116-001"
sudo docker compose --env-file .local/restore-drill/staging.env -f docker-compose.staging.yml up -d --wait
```

Restore script'i çalışan container'ı veya dolu data volume'ünü reddeder; veri silmez. Saklanan image ID yerelde bulunmalı; eski tag/image'i önceden koruyun. Yeni hedefin `STAGING_TAG` değerini yedek image'iyle eşleştirin; farklı sürümle restore migration yapmayın.

Sonra health, yönetici girişi, dosya hash'leri, cihaz/playlist sayıları, anonim medya 403, yetkili medya, `PRAGMA integrity_check` ve `foreign_key_check` kontrol edin. İlk VM'nin DB'si Docker testine taşınmadı; restore tatbikatı ayrı üretilen staging verisiyle yapıldı. Gerçek VPS/off-site restore denenmedi.

## Güncelleme ve rollback

Önce yedek, mevcut commit ve image ID kaydı alın. Yeni sürümü yeni tag'le hazırlayıp test edin. Rollback gerekiyorsa önceki image + onunla uyumlu **yeni restore volume'ü** + aynı secret ile yeni projede açın; eski volume'ü silmeyin. DB şeması ileri taşındıysa yalnız image'i geri almak yeterli değildir. Başarılı tatbikattan önce müşteri alınmamalı.
