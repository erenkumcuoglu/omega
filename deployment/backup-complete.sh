#!/bin/bash

# Omega Dijital Complete Yedekleme Kurulumu
# Oracle VM üzerinde çalıştırılır

echo "💾 OMEGA DİJİTAL — COMPLETE YEDEKLEME KURULUMU"
echo "=================================================="

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📍 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Bu script root olarak çalıştırılmalıdır"
        exit 1
    fi
}

# Root kontrolü
check_root

# Menü
echo ""
echo "🎯 YEDEKLEME SEÇENEKLERİ:"
echo "======================="
echo "1. Tam Kurulum (rclone + yedekleme script'i)"
echo "2. Sadece Yedekleme Script Kurulumu"
echo "3. Yedekleme Durum Kontrolü"
echo "4. Manuel Yedekleme"
echo "5. Restore İşlemi"
echo ""

read -p "Seçiminiz (1-5): " choice

case $choice in
    1)
        print_step "TAM YEDEKLEME KURULUMU"
        echo ""
        print_step "1. rclone kurulumu..."
        ./rclone-setup.sh
        
        print_step "2. Yedekleme kurulumu..."
        ./backup-install.sh
        
        print_success "Tam yedekleme kurulumu tamamlandı!"
        ;;
        
    2)
        print_step "SADECE YEDEKLEME SCRIPT KURULUMU"
        ./backup-install.sh
        ;;
        
    3)
        print_step "YEDEKLEME DURUM KONTROLÜ"
        ./backup-status.sh
        ;;
        
    4)
        print_step "MANUEL YEDEKLEME"
        echo "Yedekleme başlatılıyor..."
        sudo -u omega /opt/omega-backup/backup.sh
        ;;
        
    5)
        print_step "RESTORE İŞLEMİ"
        ./backup-restore.sh list
        echo ""
        echo "Restore komutları:"
        echo "  ./backup-restore.sh local <dosya_adı>"
        echo "  ./backup-restore.sh drive <dosya_adı>"
        ;;
        
    *)
        print_error "Geçersiz seçim"
        exit 1
        ;;
esac

echo ""
echo "📋 EK BİLGİLER:"
echo "==============="
echo "🔗 Google Drive Bağlantısı:"
echo "   Kendi bilgisayarınızda: rclone config"
echo "   Config kopyalama: scp ~/.config/rclone/rclone.conf ubuntu@<IP>:~/.config/rclone/rclone.conf"
echo ""
echo "📁 Yedek Konumları:"
echo "   Sunucu: /opt/omega-backup/files/"
echo "   Google Drive: omega-gdrive:omega-backups/"
echo ""
echo "⏰ Zamanlama:"
echo "   Otomatik: Her gece 02:00 (cron)"
echo "   Manuel: sudo -u omega /opt/omega-backup/backup.sh"
echo ""
echo "📊 İzleme:"
echo "   Durum: ./backup-status.sh"
echo "   Log: sudo -u omega tail -f /opt/omega-backup/backup.log"
echo ""
echo "🔄 Local Bilgisayara İndirme:"
echo "   Script: ../omega-pull-backup.sh"
echo "   ORACLE_IP değişkenini güncellemeyi unutmayın!"
echo ""
echo "🎉 OMEGA DİJİTAL — YEDEKLEME SİSTEMİ HAZIR!"
