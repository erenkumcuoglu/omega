#!/bin/bash

# PostgreSQL Yapılandırması
# Bu script VM içinde çalıştırılacak

echo "🐘 PostgreSQL Yapılandırması Başlatılıyor..."

# PostgreSQL servisi başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Rastgele şifre oluştur
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "🔐 Veritabanı şifresi: $DB_PASSWORD"
echo "⚠️  Bu şifreyi .env dosyasında kullanacaksınız!"

# PostgreSQL komutları
sudo -u postgres psql << EOF
-- Veritabanı ve kullanıcı oluştur
CREATE DATABASE omega_db;
CREATE USER omega WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE omega_db TO omega;
\q
EOF

# Bağlantıyı test et
echo "🔍 Veritabanı bağlantısı test ediliyor..."
if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL bağlantısı başarılı"
else
    echo "❌ PostgreSQL bağlantısı başarısız"
    exit 1
fi

# pg_hba.conf yapılandırması (localhost için md5)
sudo sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" /etc/postgresql/*/main/pg_hba.conf

# PostgreSQL restart
sudo systemctl restart postgresql

echo "🐘 PostgreSQL yapılandırması tamamlandı!"
echo "📋 Kullanılacak bilgiler:"
echo "   Database: omega_db"
echo "   User: omega"
echo "   Password: $DB_PASSWORD"
echo "   Host: localhost"
echo ""
echo "🔗 Bağlantı string: postgresql://omega:$DB_PASSWORD@localhost:5432/omega_db"
