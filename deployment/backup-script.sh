#!/bin/bash

# Omega Dijital Otomatik DB Yedekleme
# PostgreSQL → Local + Google Drive

# ─── Ayarlar ───────────────────────────────────────────
DB_NAME="omega_db"
DB_USER="omega"
BACKUP_DIR="/opt/omega-backup/files"
GDRIVE_REMOTE="omega-gdrive:omega-backups"
KEEP_DAYS=7
LOG_FILE="/opt/omega-backup/backup.log"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="omega_db_${DATE}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"
# ───────────────────────────────────────────────────────

# Log fonksiyonu
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Başlangıç
log "━━━ Yedekleme başladı: $FILENAME"

# Klasör kontrolü
mkdir -p "$BACKUP_DIR"

# 1. PostgreSQL dump al
log "DB dump alınıyor..."

# .env'den şifreyi al
ENV_FILE="/home/omega/omega/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    log "HATA: .env dosyası bulunamadı: $ENV_FILE"
    exit 1
fi

DB_PASSWORD=$(grep DATABASE_URL "$ENV_FILE" \
  | grep -oP '(?<=:)[^@]+(?=@)' \
  | tail -1)

if [ -z "$DB_PASSWORD" ]; then
    log "HATA: Database şifresi bulunamadı"
    exit 1
fi

# Dump al
export PGPASSWORD="$DB_PASSWORD"
if pg_dump -U "$DB_USER" -d "$DB_NAME" -h localhost \
  | gzip > "$FILEPATH"; then
    
    FILESIZE=$(du -sh "$FILEPATH" | cut -f1)
    log "Dump tamamlandı. Boyut: $FILESIZE"
else
    log "HATA: DB dump başarısız!"
    exit 1
fi

# 2. Google Drive'a yükle
log "Google Drive'a yükleniyor..."
if rclone copy "$FILEPATH" "$GDRIVE_REMOTE" \
  --log-file="$LOG_FILE" \
  --log-level INFO; then
    
    log "Google Drive yükleme tamamlandı."
else
    log "HATA: Google Drive yükleme başarısız!"
    # Drive başarısız olsa bile local yedek var, devam et
fi

# 3. Eski yerel yedekleri temizle
log "Eski yerel yedekler temizleniyor (${KEEP_DAYS} günden eski)..."
DELETED_LOCAL=$(find "$BACKUP_DIR" -name "*.sql.gz" \
  -mtime +$KEEP_DAYS -delete -print | wc -l)

if [ "$DELETED_LOCAL" -gt 0 ]; then
    log "$DELETED_LOCAL adet eski yerel yedek silindi."
else
    log "Silinecek eski yerel yedek bulunamadı."
fi

# 4. Eski Drive yedeklerini temizle
log "Eski Drive yedikleri temizleniyor..."
if rclone delete "$GDRIVE_REMOTE" \
  --min-age ${KEEP_DAYS}d \
  --include "*.sql.gz" \
  --log-file="$LOG_FILE" \
  --log-level INFO; then
    
    log "Drive temizliği tamamlandı."
else
    log "Drive temizliğinde hata (dosya olmayabilir)"
fi

# 5. Özet ve kontrol
TOTAL_LOCAL=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
TOTAL_DRIVE=$(rclone ls "$GDRIVE_REMOTE" --include "*.sql.gz" 2>/dev/null | wc -l)

log "━━━ Yedekleme tamamlandı: $FILENAME"
log "📊 Özet:"
log "   - Yerel yedek sayısı: $TOTAL_LOCAL"
log "   - Drive yedek sayısı: $TOTAL_DRIVE"
log "   - Dosya boyutu: $FILESIZE"
log ""

# Başarılı olduğunu log'a yaz
echo "$(date '+%Y-%m-%d %H:%M:%S') - SUCCESS - $FILENAME - ${FILESIZE}" >> /opt/omega-backup/backup-status.log

exit 0
