# Kontrollü VPS staging öncesi kontrol listesi

Bu dosya dağıtım yapıldığı anlamına gelmez. Ubuntu/VPS, gerçek DNS, Let's Encrypt ve firewall değişiklikleri bu çalışmada uygulanmadı.

- [ ] Yetkili VPS/klasör/operatör belli; mevcut proje, port, Docker ağ ve disk envanteri alınmış.
- [ ] Git diff/commit'ler incelenmiş; GitHub push için kullanıcı onayı alınmış. Upstream/force push yok.
- [ ] `.env`, `.local`, VM/DB/backup/secret ve kişisel test verisi izlenmiyor; image context'ine de girmiyor.
- [ ] Ayrı Compose proje adı ve çakışmayan subnet/IP/volume; mevcut Nginx/container/firewall'a değişiklik yok.
- [ ] Reviewed image tag/ID ve kaynak commit kaydı; sabit base/proxy digest; npm audit ve production SBOM/NOTICE hazır.
- [ ] OS/FFmpeg/font/native lisans ve kaynak sağlama yükümlülükleri incelenmiş; npm envanteri tek başına yeterli sayılmıyor.
- [ ] `saas-staging` sözleşmesi geçiyor; yanlış medya flag/secret/proxy/env ile başlamadığı doğrulanmış.
- [ ] JWT secret 400/600, UID 1000; TLS key UID 101 ve sınırlı izinli; eski secret korunuyor.
- [ ] Geçerli TLS/DNS/yenileme ve IP/VPN erişimi; backend portu yayınlanmıyor; Nginx başlıkları yeniliyor.
- [ ] Docker'ın firewall etkisi ayrıca incelenmiş; localhost binding izinsiz genişletilmemiş.
- [ ] App non-root/read-only/cap-drop/no-new-privileges; writable alanlar, CPU/RAM/PID ve restart sınırları incelenmiş.
- [ ] İlk admin izinli bağlantıyla kurulmuş; sonradan genel kayıt kapalı.
- [ ] Medya yükleme, pairing, üç ekran, wall, Range/HEAD, anonim/cross-tenant negatifleri geçiyor.
- [ ] Dashboard/player scope'ları ayrı; shell ve medya hazır; eksik/bozuk cache onarımı ve sürüm geçişi denenmiş.
- [ ] Gerçek origin durdurma, offline reload/browser restart, yeniden bağlantı/yayın güncellemesi geçmiş.
- [ ] Container restart sonrası veri kalıcı; yeni boş volume'e backup/restore ve DB integrity geçmiş.
- [ ] Log rotation/disk alarmı/health gözlemi var. `df -h`, `docker system df`, Compose health düzenli izleniyor; otomatik prune yok.
- [ ] Güncelleme/rollback image ve şema eşleşmesiyle prova edilmiş; off-site yedek/retention ayrıca tamamlanmış.
- [ ] Native Android/Tizen/webOS gerçek cihaz kabul matrisi tamamlanmış veya bu client'lar test kapsamı dışında tutulmuş.
- [ ] Device token plaintext/rotasyon/aktif socket iptali için migration ve threat model tamamlanmış.

İlk staging, gerçek müşteri hesabı/verisi olmadan ve yalnız yetkili operatörlerle yapılmalı. Müşteri kabulünden önce native medya matrisi, token/secret yaşam döngüsü, tam tenant/socket güvenliği, cache eviction/uzun yayın ve donanım kabulü bitmeli. Bu checklist'teki bir kutu yalnız ilgili kanıt incelendiğinde işaretlenmelidir.
