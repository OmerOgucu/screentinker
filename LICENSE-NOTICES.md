# Dağıtım lisansları ve SBOM

ScreenTinker kaynak lisansı MIT'tir; kök `LICENSE` ve `NOTICE` korunur. İmajın tamamı yalnız MIT değildir. Üretim npm ağacı ile Debian/FFmpeg bileşenleri ayrı envanterlenir. GPL/LGPL ticari kullanımı kendiliğinden yasaklamaz; dağıtım biçimine göre bildirim, lisans metni, ilgili kaynak ve yeniden bağlama gibi yükümlülükler değerlendirilmelidir. Bu belge hukuki uygunluk onayı değildir.

## Aynı üretim image'inden üretim

Linux'ta, staging app sağlıklıyken repo kökünde:

```sh
cid=$(docker compose --env-file .local/staging/staging.env -f docker-compose.staging.yml ps -q app)
docker exec "$cid" node /app/scripts/license-check.js --sbom /tmp/distribution/production.cdx.json
docker exec "$cid" node /app/scripts/staging-notices.js /tmp/distribution
mkdir -p distribution
for f in production.cdx.json production-license-inventory.json THIRD-PARTY-NOTICES.txt; do
  docker exec "$cid" cat "/tmp/distribution/$f" > "distribution/$f"
done
docker exec "$cid" dpkg-query -W > distribution/debian-packages.txt
docker exec "$cid" ffmpeg -L > distribution/ffmpeg-license.txt 2>&1
docker exec "$cid" ffmpeg -buildconf > distribution/ffmpeg-buildconf.txt 2>&1
docker exec "$cid" sh -c 'find /usr/share/doc -name copyright -print0 | tar --null -T - -czf -' > distribution/debian-copyrights.tar.gz
docker inspect --format '{{.Image}}' "$cid" > distribution/image-id.txt
```

SBOM CycloneDX 1.5'tir. `license-check` üretim ağacına uygulanır; development bağımlılıklarının sonucu olarak sunulmaz. Metadata'sı eksik paketler gerçek lisans dosyası/kanıtıyla ayrıca incelenmelidir. Notice toplayıcı kök metinleri korur; alt dizindeki gömülü lisansları bulduğunu garanti etmez. Yalnız dependency metadata'sı bir dağıtım uygunluk kontrolünün tamamı değildir.

Bu çalışmada ayrı Linux Docker VM'sindeki gerçek image'den npm SBOM, notice metinleri, 288 Debian paketi için OS SBOM/lisans envanteri, FFmpeg build bilgisi ve Debian copyright arşivi üretildi. Çıktılar kaynak repo dışında `../audit/phase3/distribution/` altında; image ID/hash kayıtlarıyla eşleştirilir. Otomatik OS metin ayrıştırmasında `License:` alanı bulunmayan paketler UNRESOLVED kalır; bu paketlerin lisanssız olduğu anlamına gelmez. GPL/LGPL kategorileri aynı pakette birlikte bulunabilir.

Debian FFmpeg 5.1.9 build'i `--enable-gpl` içerir; LGPL-only build olarak tanıtılmamalıdır. FFmpeg'in [resmî lisans açıklaması](https://ffmpeg.org/legal.html) ve image'deki özgün copyright dosyaları esas alınmalıdır. OS kaynak sağlama prosedürü, codec/patent analizi, fonts/WASM ve ayrı Android/Tizen/webOS/Roku/Pi paketleri için lisans dosyaları/tüm gömülü kaynaklar henüz dağıtım kabulünden geçmedi. İmajın korunmuş bildirimleri bu eksikleri otomatik kapatmaz.

## Jimp ve Zod kararı

Jimp 1.6.1'in Zod 3 aralığı ile güvenlik override'ı Zod 4.6.7 arasında upstream semver uyumsuzluğu sürer. İncelenen [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) için düzeltilmiş sürüm 4.6.6'dır; Zod 3'e aynı sorunu geri getirecek dönüş yapılmadı. Mevcut dar override korundu; yeni major yükseltme/`audit fix --force` yapılmadı. Seçili görüntü işleme regresyonları geçse de bu upstream desteği veya tüm Jimp API'lerinin uyumluluk garantisi değildir. Dört lock ağacında güncel npm audit sıfır bilinen açık bildirdi; OS CVE taraması ayrıca gereklidir.
