#!/bin/bash

# Omega Dijital Uygulama Deploy
# Bu script VM içinde omega kullanıcısı olarak çalıştırılacak

echo "🚀 Omega Dijital Deploy Başlatılıyor..."

# Uygulama kullanıcısı oluştur (root olarak çalıştır)
if [ "$EUID" -eq 0 ]; then
    echo "👤 Uygulama kullanıcısı oluşturuluyor..."
    sudo useradd -m -s /bin/bash omega
    sudo usermod -aG sudo omega
    echo "✅ Omega kullanıcısı oluşturuldu"
    echo "🔄 Lütfen omega kullanıcısı ile giriş yapın: sudo su - omega"
    exit 0
fi

# Omega kullanıcısı kontrolü
if [ "$(whoami)" != "omega" ]; then
    echo "❌ Bu script omega kullanıcısı olarak çalıştırılmalıdır"
    echo "🔄 Komut: sudo su - omega"
    exit 1
fi

# Home dizinine git
cd /home/omega

# GitHub'dan clone et (repo adresini güncelle)
if [ ! -d "omega" ]; then
    echo "📦 Repository klonlanıyor..."
    # GitHub repo adresini buraya gir
    git clone https://github.com/SENIN_REPO/omega.git
fi

cd omega

# Backend kurulumu
echo "🔧 Backend kurulumu..."
cd backend
npm install
npm run build

# .env dosyası oluştur
echo "⚙️  .env dosyası oluşturuluyor..."

# Rastgele secret'lar oluştur
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# .env template oluştur
cat > .env << EOF
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://cms.DOMAINADIN.com

DATABASE_URL=postgresql://omega:GUCLU_SIFRE_YAZ@localhost:5432/omega_db
REDIS_URL=redis://:REDIS_SIFRE@127.0.0.1:6379

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

TURKPIN_USERNAME=GERCEK_KULLANICI_ADINIZ
TURKPIN_PASSWORD=GERCEK_SIFRENIZ
TURKPIN_API_URL=https://api.turkpin.com

ENCRYPTION_KEY=$ENCRYPTION_KEY

# Webhook IP'leri — gerçek kanal IP'lerini yaz
TRENDYOL_WEBHOOK_IPS=
HEPSIBURADA_WEBHOOK_IPS=
ALLEGRO_WEBHOOK_IPS=
DARAZ_LK_WEBHOOK_IPS=

# Webhook Secret'ları — her kanalın panelindan al
TRENDYOL_WEBHOOK_SECRET=
HEPSIBURADA_WEBHOOK_SECRET=
ALLEGRO_WEBHOOK_SECRET=
DARAZ_LK_WEBHOOK_SECRET=

BALANCE_ALERT_THRESHOLD=1000
ADMIN_EMAIL=
EOF

echo "✅ .env dosyası oluşturuldu"
echo "⚠️  Lütfen .env dosyasını düzenleyerek gerçek değerleri girin:"
echo "   - DATABASE_URL (PostgreSQL şifresi)"
echo "   - REDIS_URL (Redis şifresi)"
echo "   - TURKPIN_USERNAME/PASSWORD"
echo "   - Webhook IP'leri ve secret'ları"

# Database migration ve seed
echo "🗄️  Database migration ve seed..."
npx prisma migrate deploy
npx prisma db seed

# Frontend build
echo "🎨 Frontend build..."
cd ../frontend
npm install
npm run build

echo "✅ Uygulama kurulumu tamamlandı!"
echo "📋 Sonraki adım: PM2 ile servisleri başlat"
