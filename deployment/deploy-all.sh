#!/bin/bash

# Omega Dijital Complete Deployment
# Oracle Cloud Always Free VM için tam deploy script

echo "🚀 OMEGA DİJİTAL — PRODUCTION DEPLOYMENT"
echo "=========================================="
echo "Oracle Cloud Always Free VM (Ubuntu 22.04)"
echo ""

# Renk tanımlamaları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper fonksiyonları
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

# Script başlangıcı
print_step "Oracle Cloud VM Deploy Script Başlatılıyor..."

# Mevcut kullanıcı kontrolü
if [ "$EUID" -eq 0 ]; then
    print_step "Root user olarak çalıştırılıyor"
else
    print_warning "Omega kullanıcısı olarak çalıştırılıyor"
fi

echo ""
echo "📋 DEPLOYMENT ADIMLARI:"
echo "======================"
echo "1. Oracle Cloud VM kurulumu (manuel)"
echo "2. Sunucu hazırlığı (otomatik)"
echo "3. Uygulama deploy (otomatik)"
echo "4. Nginx yapılandırma (otomatik)"
echo "5. SSL sertifikası (otomatik)"
echo "6. Güvenlik sertleştirme (otomatik)"
echo "7. Sağlık kontrolü (otomatik)"
echo ""

echo "🔧 ÖNEMİ NOTLAR:"
echo "==============="
echo "• Oracle Cloud Console'dan VM oluşturmanız gerekiyor"
echo "• Public IP adresini not alın (Turkpin için kritik)"
echo "• Domain DNS'inin VM IP'sine yönlendirilmesi gerekli"
echo "• Webhook IP'lerini kanal panellerinden almalısınız"
echo ""

# Menü
echo "🎯 DEPLOYMENT SEÇENEKLERİ:"
echo "=========================="
echo "1. Tam Sunucu Kurulumu (yeni VM)"
echo "2. Uygulama Deploy (mevcut sunucu)"
echo "3. Sistem Güncelleme"
echo "4. Sağlık Kontrolü"
echo "5. Bakım Komutları"
echo ""

read -p "Seçiminiz (1-5): " choice

case $choice in
    1)
        print_step "TAM SUNUCU KURULUMU"
        echo "Bu seçenek yeni Oracle Cloud VM için:"
        echo "1. Oracle Console'dan VM oluştur (manuel)"
        echo "2. Bu script'i VM içinde çalıştır"
        echo ""
        echo "📋 VM Özellikleri:"
        echo "   - Name: omega-production"
        echo "   - Image: Ubuntu 22.04"
        echo "   - Shape: VM.Standard.E2.1.Micro (Always Free)"
        echo "   - Public IP: ASSIGN (sabit)"
        echo "   - Ports: 22, 80, 443 açık"
        echo ""
        read -p "VM oluşturuldu mu? (e/H): " vm_ready
        
        if [ "$vm_ready" = "e" ]; then
            print_step "Sunucu hazırlığı başlatılıyor..."
            ./server-setup.sh
            ./postgres-setup.sh
            ./redis-setup.sh
            ./oracle-firewall-setup.sh
            print_success "Sunucu hazırlığı tamamlandı"
            
            print_step "Uygulama deploy başlatılıyor..."
            sudo -u omega bash ./app-deploy.sh
            print_success "Uygulama deploy tamamlandı"
            
            print_step "PM2 servisleri başlatılıyor..."
            sudo -u omega bash ./pm2-start.sh
            print_success "PM2 servisleri başlatıldı"
            
            print_step "Nginx yapılandırması..."
            ./nginx-config.sh
            print_success "Nginx yapılandırıldı"
            
            print_step "SSL sertifikası..."
            ./ssl-setup.sh
            print_success "SSL kuruldu"
            
            print_step "Güvenlik sertleştirme..."
            ./security-setup.sh
            print_success "Güvenlik yapılandırıldı"
            
            print_step "Sağlık kontrolü..."
            ./health-check.sh
            print_success "Deployment tamamlandı!"
        else
            print_warning "VM oluşturulduktan sonra tekrar çalıştırın"
        fi
        ;;
        
    2)
        print_step "UYGULAMA DEPLOY (MEVCUT SUNUCU)"
        print_step "Uygulama deploy başlatılıyor..."
        sudo -u omega bash ./app-deploy.sh
        print_success "Uygulama deploy tamamlandı"
        
        print_step "PM2 servisleri başlatılıyor..."
        sudo -u omega bash ./pm2-start.sh
        print_success "PM2 servisleri başlatıldı"
        ;;
        
    3)
        print_step "SİSTEM GÜNCELLEME"
        apt update && apt upgrade -y
        print_success "Sistem güncellendi"
        ;;
        
    4)
        print_step "SAĞLIK KONTROLÜ"
        ./health-check.sh
        ;;
        
    5)
        print_step "BAKIM KOMUTLARI"
        ./maintenance-commands.sh
        ;;
        
    *)
        print_error "Geçersiz seçim"
        exit 1
        ;;
esac

echo ""
echo "🎉 OMEGA DİJİTAL DEPLOYMENT"
echo "=========================="
echo "✅ Production hazır!"
echo "🌐 CMS: https://DOMAIN_ADINIZ"
echo "🔧 API: https://DOMAIN_ADINIZ/api"
echo "📊 Health: https://DOMAIN_ADINIZ/api/system/health"
echo ""
echo "📋 SONRASI ADIMLAR:"
echo "==================="
echo "1. Turkpin'e IP whitelist talebi gönderin"
echo "2. Kanal webhook IP'lerini alın ve .env'e ekleyin"
echo "3. Webhook secret'larını alın ve .env'e ekleyin"
echo "4. PM2 restart: pm2 restart omega-api"
echo ""
echo "🔧 DESTEK:"
echo "=========="
echo "• Log'lar: pm2 logs omega-api --follow"
echo "• Durum: pm2 status"
echo "• Sağlık: ./health-check.sh"
echo "• Bakım: ./maintenance-commands.sh"
