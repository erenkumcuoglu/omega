#!/bin/bash

# rclone Kurulum ve Google Drive Bağlantısı
# Oracle VM üzerinde çalıştırılır

echo "☁️  rclone Kurulumu Başlatılıyor..."

# rclone kurulumu
if ! command -v rclone &> /dev/null; then
    echo "📦 rclone kuruluyor..."
    curl https://rclone.org/install.sh | sudo bash
    
    if command -v rclone &> /dev/null; then
        echo "✅ rclone kuruldu"
        rclone version
    else
        echo "❌ rclone kurulumu başarısız"
        exit 1
    fi
else
    echo "✅ rclone zaten kurulu"
    rclone version
fi

# Config klasörü oluştur
mkdir -p ~/.config/rclone

echo ""
echo "🔗 Google Drive Bağlantısı Kurulumu"
echo "=================================="
echo "⚠️  BU ADIMI KENDİ BİLGİSAYARINDA YAPIN!"
echo ""
echo "1. Kendi bilgisayarınızda rclone kurun:"
echo "   Mac: brew install rclone"
echo "   Linux: curl https://rclone.org/install.sh | sudo bash"
echo ""
echo "2. Config başlatın:"
echo "   rclone config"
echo ""
echo "3. Adımlar:"
echo "   n → New remote"
echo "   name: omega-gdrive"
echo "   Storage: drive (Google Drive)"
echo "   client_id: (boş bırak, Enter)"
echo "   client_secret: (boş bırak, Enter)"
echo "   scope: 1 (full access)"
echo "   root_folder_id: (boş bırak, Enter)"
echo "   service_account_file: (boş bırak, Enter)"
echo "   Edit advanced config: n"
echo "   Use auto config: y"
echo "   → Tarayıcı açılır, Google hesabınızla giriş yapın"
echo "   Configure as shared drive: n"
echo ""
echo "4. Config'i görüntüle:"
echo "   rclone config show"
echo ""
echo "5. Oracle VM'e kopyala:"
echo "   scp ~/.config/rclone/rclone.conf ubuntu@<ORACLE_IP>:~/.config/rclone/rclone.conf"
echo ""
echo "6. Oracle VM'de test et:"
echo "   rclone lsd omega-gdrive:"
echo ""

# Config dosyası kontrolü
if [ -f ~/.config/rclone/rclone.conf ]; then
    echo "✅ Config dosyası mevcut"
    echo "🔍 Test ediliyor..."
    
    if rclone lsd omega-gdrive: &> /dev/null; then
        echo "✅ Google Drive bağlantısı başarılı"
        
        # omega-backups klasörü oluştur
        echo "📁 omega-backups klasörü oluşturuluyor..."
        rclone mkdir omega-gdrive:omega-backups
        
        if rclone lsd omega-gdrive: | grep -q "omega-backups"; then
            echo "✅ omega-backups klasörü oluşturuldu"
        else
            echo "⚠️  Klasör oluşturulamadı (manuel olarak yapın)"
        fi
        
    else
        echo "❌ Google Drive bağlantısı başarısız"
        echo "🔧 Config'i kontrol edin veya yeniden yapın"
        exit 1
    fi
else
    echo "⚠️  Config dosyası bulunamadı"
    echo "📋 Yukarıdaki adımları takip edin"
    exit 1
fi

echo ""
echo "🎉 rclone kurulumu tamamlandı!"
echo "📋 Sonraki adım: yedekleme script'i"
