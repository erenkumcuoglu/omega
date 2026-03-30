#!/bin/bash

# Omega Dijital Yedekleme Kurulum Script'i
# Oracle VM üzerinde çalıştırılır

echo "💾 Omega Dijital Yedekleme Kurulumu Başlatılıyor..."

# Root kontrolü
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script root olarak çalıştırılmalıdır"
    exit 1
fi

# 1. Klasörleri oluştur
echo "📁 Yedekleme klasörleri oluşturuluyor..."
mkdir -p /opt/omega-backup/files
mkdir -p /opt/omega-backup/logs

# 2. Script'i kopyala ve izinleri ayarla
echo "📄 Yedekleme script'i kuruluyor..."
cp "$(dirname "$0")/backup-script.sh" /opt/omega-backup/backup.sh
chmod +x /opt/omega-backup/backup.sh

# 3. Log dosyaları oluştur
touch /opt/omega-backup/backup.log
touch /opt/omega-backup/cron.log
touch /opt/omega-backup/backup-status.log

# 4. Sahiplik ayarla
echo "👤 Dosya sahipliği ayarlanıyor..."
chown -R omega:omega /opt/omega-backup

# 5. Cron job ekle
echo "⏰ Cron job ayarlanıyor..."
CRON_ENTRY="# Omega DB Yedekleme — Her gece 02:00\n0 2 * * * /opt/omega-backup/backup.sh >> /opt/omega-backup/cron.log 2>&1"

# Omega kullanıcısının crontab'ına ekle
sudo -u omega bash -c 'crontab -l 2>/dev/null; echo "0 2 * * * /opt/omega-backup/backup.sh >> /opt/omega-backup/cron.log 2>&1"' | crontab -

# 6. Cron servisini kontrol et
echo "🔄 Cron servisi kontrol ediliyor..."
if ! systemctl is-active --quiet cron; then
    echo "🔧 Cron servisi başlatılıyor..."
    systemctl enable cron
    systemctl start cron
fi

# 7. Test çalıştır
echo "🧪 Test yedeklemesi başlatılıyor..."
sudo -u omega /opt/omega-backup/backup.sh

# 8. Sonuçları kontrol et
echo "📊 Sonuçlar kontrol ediliyor..."
echo ""

echo "📁 Yerel yedek dosyaları:"
sudo -u omega ls -lah /opt/omega-backup/files/

echo ""
echo "☁️  Google Drive yedek dosyaları:"
sudo -u omega rclone ls omega-gdrive:omega-backups 2>/dev/null || echo "⚠️  Google Drive bağlantısı kontrol edin"

echo ""
echo "📝 Yedekleme log'u (son 10 satır):"
sudo -u omega tail -10 /opt/omega-backup/backup.log

echo ""
echo "⏰ Cron job listesi:"
sudo -u omega crontab -l

echo ""
echo "✅ Yedekleme kurulumu tamamlandı!"
echo "📋 Özet:"
echo "   - Yedekleme script'i: /opt/omega-backup/backup.sh"
echo "   - Yedekleme zamanı: Her gece 02:00"
echo "   - Yedek saklama süresi: 7 gün"
echo "   - Log dosyası: /opt/omega-backup/backup.log"
echo ""
echo "🔧 Manuel test için:"
echo "   sudo -u omega /opt/omega-backup/backup.sh"
echo ""
echo "📊 Log izleme için:"
echo "   sudo -u omega tail -f /opt/omega-backup/backup.log"
