# Device token hashleme ve rotasyon planı

Bu fazda mevcut DB'deki plaintext token silinmedi veya topluca döndürülmedi. HTTP medya erişimi canlı token/hash bağı, blocked ve workspace kontrolü yapar. Mevcut storage biçimi ve tüm native/edge kayıt protokolünü değiştirmek daha geniş bir migration'dır.

## Neden ayrı migration?

HTTP middleware, Socket.IO register, enrollment/mirror, edge relay, native config ve yeniden bağlantı yolları token'ı okuyor; bazı client'lar `device:registered` içindeki token'ı yeniden saklıyor. Yalnız DB kolonunu hash'e çevirmek yeniden bağlantıyı ve offline cihazları bozabilir. Authenticated mevcut socket'in yalnız başlangıçta doğrulanması da, DB'de token değişince bütün açık odaların anlık kapanmasını garanti etmez. Bu durum bu fazda kapatılmış sayılmıyor.

## Aşamalı tasarım

1. Nullable `device_token_hash`, hash sürümü ve `credential_version` kolonları ekle. Yüksek entropili mevcut random token için domain-separated SHA-256 ve sabit-zamanlı karşılaştırma kullan. Yeni token yalnız bir kez client'a gönderilsin; log/query'ye yazılmasın.
2. Tek ortak `verifyDeviceCredential(id, token)` fonksiyonunu HTTP/WS/edge/mirror yollarına uygula. Dual-read dönemde hash öncelikli, eski plaintext fallback ölçümlü olsun. Mevcut veriden hash üretimi küçük transaction batch'leriyle ve öncesinde tutarlı yedekle yapılmalı.
3. Android/web/legacy/Tizen/webOS client'larının yeniden kayıt cevabında token yoksa mevcut token'ı koruduğunu, yeni token varsa güvenle kaydettiğini doğrula. Keystore/plain-storage fallback ayrıca incelenmeli.
4. Fresh-auth/MFA gerektiren yönetici rotasyon/iptal API'si, audit ve cihaz/workspace izni ekle. Credential version, workspace ve blocked bilgisi socket kimliğine bağlansın. İptalde tüm mevcut cihaz odaları/edge bağlantıları kapatılsın; pasif alıcının yeni tenant payload'ı almaması da test edilsin.
5. Offline cihazın dönmesi için kontrollü re-pair veya süreli, açıkça tanımlı rotasyon ACK protokolü kullan. Sınırsız çift token kabulü yapma. Şema geri dönüşünde eski backup secret ve sürüm eşleşmesi korunmalı.
6. Tüm client/edge testleri geçince yeni kayıtlarda plaintext yazmayı durdur, eski plaintext'i ayrı onaylı migration ile temizle. Eski yedeklerin de credential taşıdığı unutulmasın.

## Kabul testleri

Yeni/eski token ile HTTP ve WS; yanlış cihaz/tenant; geçersiz/iptal/blocked; aktif socket'e anlık iptal; workspace taşıma ve room sızıntısı; rotasyon yarıda kesilmesi; offline dönüş; mirror/edge; backup/restore; eski client rollback. Hash kolonunun varlığı tek başına başarı değildir.

Gerçek müşteri kabulünden önce bu iş tamamlanmalı veya cihaz kimliği riski açık bir kabul kararıyla ayrıca yönetilmelidir. Test staging'i müşteri üretimi olarak sunulmamalı.
