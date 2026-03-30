#!/bin/bash

# Omega Dijital DB Restore Script'i
# Google Drive veya yerel yedekten geri yükleme

echo "🔄 Omega Dijital DB Restore"

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_usage() {
    echo "Kullanım:"
    echo "  $0 [kaynak] [dosya]"
    echo ""
    echo "Kaynak seçenekleri:"
    echo "  local    - Yerel yedekten geri yükle"
    echo "  drive    - Google Drive'dan geri yükle"
    echo "  list     - Mevcut yedekleri listele"
    echo ""
    echo "Örnekler:"
    echo "  $0 list                    # Tüm yedekleri listele"
    echo "  $0 local omega_db_2026-03-28_02-00-00.sql.gz"
    echo "  $0 drive omega_db_2026-03-28_02-00-00.sql.gz"
    exit 1
}

# Parametre kontrolü
if [ $# -lt 1 ]; then
    print_usage
fi

SOURCE="$1"
FILENAME="$2"

# Yedekleri listele
list_backups() {
    echo ""
    echo "📁 MEVCUT YEDEKLER"
    echo "=================="
    
    echo ""
    echo "🖥️  Yerel yedekler:"
    if [ -d "/opt/omega-backup/files" ]; then
        sudo -u omega ls -lah /opt/omega-backup/files/*.sql.gz 2>/dev/null | tail -10
    else
        echo "Yerel yedek klasörü bulunamadı"
    fi
    
    echo ""
    echo "☁️  Google Drive yedekleri:"
    if sudo -u omega rclone lsd omega-gdrive:omega-backups &>/dev/null; then
        sudo -u omega rclone ls omega-gdrive:omega-backups --include "*.sql.gz" | tail -10
    else
        echo "Google Drive bağlantısı yok"
    fi
    
    echo ""
}

# Restore fonksiyonu
restore_backup() {
    local source_type="$1"
    local filename="$2"
    local temp_file="/tmp/omega_restore_$(date +%s).sql.gz"
    
    echo ""
    echo "⚠️  DİKKAT: Bu işlem mevcut veritabanını üzerine yazacaktır!"
    echo "Kaynak: $source_type"
    echo "Dosya: $filename"
    echo ""
    read -p "Devam etmek istiyor musunuz? (e/H): " confirm
    
    if [ "$confirm" != "e" ]; then
        echo "İptal edildi."
        exit 0
    fi
    
    # Dosyayı al
    case "$source_type" in
        "local")
            echo "📁 Yerel yedek alınıyor..."
            if [ -f "/opt/omega-backup/files/$filename" ]; then
                sudo -u omega cp "/opt/omega-backup/files/$filename" "$temp_file"
            else
                echo -e "${RED}❌ Yerel yedek dosyası bulunamadı${NC}"
                exit 1
            fi
            ;;
        "drive")
            echo "☁️  Google Drive'dan yedek alınıyor..."
            if sudo -u omega rclone copy "omega-gdrive:omega-backups/$filename" "$temp_file"; then
                echo "✅ Google Drive'dan indirildi"
            else
                echo -e "${RED}❌ Google Drive'dan indirme başarısız${NC}"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}❌ Geçersiz kaynak${NC}"
            exit 1
            ;;
    esac
    
    # Restore et
    echo "🔄 Veritabanı geri yükleniyor..."
    
    # .env'den şifreyi al
    ENV_FILE="/home/omega/omega/backend/.env"
    DB_PASSWORD=$(grep DATABASE_URL "$ENV_FILE" \
      | grep -oP '(?<=:)[^@]+(?=@)' \
      | tail -1)
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if gunzip -c "$temp_file" | psql -U omega -d omega_db -h localhost; then
        echo -e "${GREEN}✅ Restore başarılı!${NC}"
        
        # Servisleri restart et
        echo "🔄 Servisler yeniden başlatılıyor..."
        sudo -u omega pm2 restart omega-api
        
        echo -e "${GREEN}🎉 Veritabanı başarıyla geri yüklendi!${NC}"
    else
        echo -e "${RED}❌ Restore başarısız!${NC}"
        exit 1
    fi
    
    # Temizlik
    rm -f "$temp_file"
}

# Ana logic
case "$SOURCE" in
    "list")
        list_backups
        ;;
    "local"|"drive")
        if [ -z "$FILENAME" ]; then
            echo -e "${RED}❌ Dosya adı gerekli${NC}"
            print_usage
        fi
        restore_backup "$SOURCE" "$FILENAME"
        ;;
    *)
        echo -e "${RED}❌ Geçersiz kaynak${NC}"
        print_usage
        ;;
esac
