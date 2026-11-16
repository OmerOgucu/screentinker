# Player medya uyumluluğu

| İstemci | Kaynak davranışı / değişiklik | Doğrulama | Kalan sınır |
|---|---|---|---|
| Web | Header ile device grant, kısa HttpOnly cookie; aynı-origin medya; ayrı worker scope ve shell repair | Gerçek Chrome, üç bağımsız player, wall, servis kesintisi/reload/restart; rapordaki kanıtlar | Uzun eviction/TV decoder/kare sunumu yok |
| Legacy web | Aynı kaynak ES5/Chrome53 çıktısına üretiliyor | Build/check ve seçili testler; browser kod yolu | Gerçek Chrome53/TV donanımı yok |
| Android | ContentCache/BundleCache OkHttp client'ı yalnız server'ın private medya yollarına Bearer + X-ST-Device-Id ekler; redirect kapalı | Kotlin/Java derleme ve 727 JVM testi, yeni header/origin testleri dahil | Fiziksel Android oynatma, direkt ExoPlayer/ImageLoader network fallback ve widget ağ yolları doğrulanmadı; signed APK dağıtımı yapılmadı |
| Tizen paket | Cache Range XHR ve bundle indirmesine origin-kısıtlı header adaptörü eklendi; URL token yok | ES5 adaptör Node testleri ve mevcut Tizen karar testleri kapsamına göre | Panel filesystem/AVPlay, cross-origin redirect, credentialed iframe ve network fallback test edilmedi |
| LG webOS | Paket server-hosted `/player` veya legacy iframe'i açar; yeni web grant akışı bu iframe'dedir | Kaynak incelemesi; web player testi | Gerçek TV iframe cookie/storage/SW ve codec davranışı NOT TESTED |

Header desteği, bütün client'ın özel medya ile çalıştığının kanıtı değildir. Native indirme tamamlanmadan network fallback yetkisiz kalabilir; bunu gizli medyayı public yaparak çözmeyin. Tizen/webOS paketlerini bütün filoya dağıtmadan cihaz matrisi gerekir.

Public share, thumbnail, wall ve media proxy, server tarafındaki aynı workspace/grant sınırından geçer. Uploaded font/widget read yolları da korunur. Opaque-origin widget frame'leri, dinamik veri ve üçüncü taraf cookie kısıtları için tüm kombinasyonlar test edilmedi; özel widget'lar ayrı kabul ister.

Offline-ready: yalnız playlistin localStorage'da olması veya medyanın indirilmesi yeterli değildir. Worker manifestteki shell dosyalarını doğrulamalı; medya tamamlanmalı. Cache tümüyle silinmişken bağlantısız yeniden açılan player kod üretemez; açıklayıcı reconnect sayfası gösterir ve bağlantı dönünce onarır. Kalıcı storage izni gelecekte eviction olmayacağı garantisi değildir.

Web/legacy console log'larına display key/Bearer/nested token redaksiyonu eklendi. Mevcut enrollment linkleri ayrıca gizli tutulmalı. Önceden indirilmiş içerik token iptaliyle uzaktan yok edilemez. Her ekranda ayrı, yalnız o ekrana ait browser profili kullanın.
