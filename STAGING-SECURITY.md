# Staging güvenlik sözleşmesi

`DEPLOYMENT_PROFILE=saas-staging` yanlış yapılandırmada, dependency preflight ve DB açılışından önce hata verir. Staging image entrypoint'i farklı profile geçilmesini de reddeder. Mevcut self-hosted kurulumların varsayılan davranışı korunur.

Zorunlu: production, `MEDIA_REQUIRE_AUTH=true`, `DISABLE_REGISTRATION=true`, `ST_SQLITE_DRIVER=node`, `ST_SKIP_DEP_PREFLIGHT=1`, `/data`, HTTPS origin olarak `APP_URL`, tekil güvenilir proxy IP'leri ve en az 48 karakterli, başkalarınca okunamayan `JWT_SECRET_FILE`. Boş/geniş proxy ağı, yanlış boolean ve tehlikeli path/service override'ları reddedilir.

App UID/GID 1000, read-only root, writable `/data` volume ve sınırlı `/tmp`, `cap_drop: ALL`, `no-new-privileges`, PID/CPU/RAM sınırlarıyla çalışır. Nginx UID 101, read-only root ve yalnız gerekli tmpfs kullanır. Backend ağı `internal`; app'ın host portu yoktur. Proxy ayrı edge ağına bağlıdır. Bu bir internet egress allowlist'i veya container escape kanıtı değildir.

Medya: ham dosyalar, file/thumbnail/bundle/variant/sssp3-fit, media proxy, yüklenen fontlar, widget render ve belirtilen widget veri yolları kimlik ve workspace kontrolündedir. Bundled fontlar/public uygulama asset'leri ayrıdır. Public share yalnız ilgili payload ve aktif paylaşım izniyle çalışır. Medya URL'lerine device token eklenmez. HTTP Range/HEAD korunur. HttpOnly grant HTTPS'te Secure, SameSite=Lax; device blok/token/workspace ve session iptali her yeni ağ isteğinde kontrol edilir. İndirilmiş offline baytlar uzaktan iptal edilemez.

Dashboard `/app`, player `/player` scope kullanır. Worker'lar yalnız kendi eski shell cache'lerini siler. Manifest tabanlı shell denetimi eksik/yanlış MIME/boş yanıtı hazır saymaz; online onarım yapar. Medya hazır olsa bile shell eksikse cihaz kartı uyarır. Son rapor zamanını ve `offline_cache.shell_ready/offline_ready` alanlarını birlikte değerlendirin; tarayıcı sonradan storage silebilir.

Proxy tekil IP'si Compose backend ağıyla aynı parametreden gelir. Nginx gelen XFF/Proto'yu yeniler, CF-Connecting-IP'yi temizler. Gerçek reverse proxy/UFW düzenini ayrıca değerlendirin: Docker'ın yayınladığı portlar [UFW kurallarını atlayabilir](https://docs.docker.com/engine/install/ubuntu/#firewall-limitations). Burada sadece loopback yayını vardır. Mevcut VPS firewall/Nginx dosyalarına otomatik değişiklik uygulanmaz.

OTA/plugin/live-video/talk kapalı; updater/docker.sock/host-network/privileged yoktur. Host kişisel klasörleri mount edilmez. TLS ve JWT dosyaları ayrı read-only mount'lardır. JWT secret aynı zamanda mevcut entegrasyon şifreleme mekanizmasını etkilediğinden rastgele döndürülmez.

## Açık sınırlar

Device token DB'de hâlâ düz metindir; [migration planı](DEVICE-TOKEN-MIGRATION.md). HTTP iptali test edildi; mevcut açık socket'in tüm olay/oda akışlarının anlık iptali ayrı kapsamdır. Eski live/talk kanallarındaki URL tabanlı kimlik yolları staging'de kapalıdır; açılmadan önce yeniden ele alınmalı.

Staging'de workspace'i bulunmayan eski özel medya kayıtları da kapalı kalır; bunlara bir kimlik bilgisi sunmak yeterli değildir. Self-hosted legacy davranışı korunur. Staging'e veri aktarılacaksa ownerless kayıtlar açık bir tenant eşlemesiyle incelenmelidir.

Android indirme başlıkları derlenip JVM testleriyle kontrol edildi; gerçek decoder/network fallback ve cihaz cache'i test edilmedi. Tizen download adaptörü Node'da test edildi; native AVPlay doğrudan network fallback ve app-origin iframe/widget cookie davranışı doğrulanmadı. webOS server-hosted iframe kullanır; üçüncü taraf cookie/storage ve gerçek TV testi eksik. Desteklenmeyen bir client için özel medyayı kapatarak sistemi açmayın.

Bağımlılık audit'i, tam penetrasyon veya OS image CVE taraması değildir. Secret/volume sızıntısı, fiziksel cihaz erişimi, tam cache eviction, uzun süreli yük ve tenant matrisi için ek test gerekir. Müşteri kabulü henüz uygun değildir.
