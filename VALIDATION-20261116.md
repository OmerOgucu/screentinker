# Yerel staging doğrulaması — 16 Kasım 2026

Bu kayıt yerel kabul içindir; VPS/üretim dağıtımı veya ticari güvenlik sertifikası değildir. GitHub push yapılmadı. Dışarı açık servis, SSH/VPS bağlantısı veya gerçek müşteri verisi kullanılmadı.

| Kapsam | Sonuç | Sınır |
|---|---|---|
| Önceki 423 seçili Node testi | PASS | 122 + önceki 21 + 280 |
| Bu fazdaki ek 40 regresyon | PASS | Toplam 463 benzersiz Node testi; son medya sınırı değişikliğinden sonra ilgili 23 test tekrar geçti |
| Android derleme/JVM | PASS | 727 test, 0 hata/skip; üç yeni medya auth testi dahil. Fiziksel cihaz değil |
| Web ve legacy | PASS | Üç player, 3×1 görsel/video wall, modern Chrome'da derlenmiş legacy video yolu |
| Offline | PASS | Shell/media readiness, dashboard scope, bozuk cache onarımı, gerçek origin durdurma, reload/browser restart, boş shell fallback ve online toparlanma |
| Docker | PASS | Ayrı temiz Linux VM ve test DB; Compose, non-root/read-only/cap-drop/health, kapalı backend ve app egress |
| Özel medya | PASS | Anonim/cross-tenant/yanlış grant retleri, Range, iptal ve staging ownerless kayıt reddi |
| TLS | PASS | Açıkça güvenilen yerel test CA'sıyla sertifika/hostname doğrulaması ve TLS 1.3. Gerçek Let's Encrypt değil |
| Kalıcılık/restore | PASS | Restart; tutarlı app-stop yedeği; ayrı boş volume'e kayıt/dosya hash eşleşmesi; dolu volume reddi |
| npm audit | PASS | Server/Roku/root/Samsung kilit ağaçlarında bilinen açık 0; OS CVE taraması değil |
| Fiziksel Android/Tizen/webOS/TV | NOT TESTED | Native fallback/widget/cookie ve decoder matrisi eksik |
| Ubuntu VPS, DNS/ACME/firewall, off-site restore | NOT TESTED | Tasarım ve komutlar hazır; dış sistemlere uygulanmadı |

Kanıtlar kaynak repo dışında `../audit/phase3/` altında tutulur. `source-provenance.json`, çalışan yerel VM'deki değişen kaynak dosyalarını Git blob hash'leriyle ve dağıtım dosyalarını SHA256SUMS ile eşleştirir. `staging-browser-results.json`, `final-browser-results.json`, `runtime-results.json`, `backup-restore-results.json`, `ownerless-media-results.json` ve ilgili test log'ları sonuçları destekler. SBOM/NOTICE/OS copyright dosyaları `distribution/` altındadır. VM diskleri, backup arşivleri ve erişim bilgileri Git'te bulunmaz.

İlk Docker denemesinde Windows archive satır sonları Linux shell girişini bozdu; `.gitattributes` ile düzeltildi. İlk boş shell denemesinde sınırsız ağ bekleme sorunu bulundu; reconnect yanıtı sınırlandı ve gerçek servis kesintisiyle tekrar geçti. Kalıcı dashboard oturumu ve tmpfs/reboot sonrası silinen test yardımcıları gibi QA varsayımları düzeltildi. Son ownerless kontrolünde çalışan container'ın yeni build tamamlanmadan eski image'i kullandığı tespit edildi; container/tag image ID'leri eşleştirildikten sonra gerçek HTTP kontrolü geçti. Başarısız ilk denemeler son PASS sonuçları olarak sunulmaz.

Tüm tarayıcı senaryoları son shell sürümünde yapıldı. Son tenant sınırı değişikliği aynı shell'i kullanır; ilgili medya testleri ve son player/legacy çalışması yeni imajda tekrar doğrulandı. Restore tatbikatı aynı Compose/DB şemasının önceki test imajıyla yapıldı; saklanan backup image ID'si korunur. Sonraki yalnız medya guard değişikliği DB şemasını değiştirmedi.

Müşteri kabulü için hâlâ engeller var: plaintext cihaz tokenları/rotasyon migration'ı, açık socket'lerin anlık iptali ve room yeniden yetkilendirmesi, fiziksel native kabul matrisi, widget/opaque-origin sınırları, tam cache eviction/uzun yük, OS CVE ve lisans/kaynak sağlama incelemesi. Bu depo üzerinde her satırın manuel olarak denetlendiği veya açık bulunmadığı garantisi verilmez. İzole, izinli staging testi için hazırlanmıştır; müşteri üretimine hazır değildir.
