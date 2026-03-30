#!/bin/bash

# Oracle Cloud Sunucu Hazırlığı
# Bu script VM içinde çalıştırılacak

echo "🚀 Sunucu Hazırlığı Başlatılıyor..."

# Sistem güncellemeleri
echo "📦 Sistem güncellemeleri..."
sudo apt update && sudo apt upgrade -y

# Temel paketler
echo "📦 Temel paketler kuruluyor..."
sudo apt install -y \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  postgresql \
  postgresql-contrib \
  redis-server \
  ufw \
  htop \
  fail2ban \
  unattended-upgrades \
  build-essential

echo "✅ Temel paketler kuruldu"

# Node.js 20.x kurulumu
echo "📦 Node.js 20.x kurulumu..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "✅ Node.js kuruldu:"
node --version
npm --version

# PM2 kurulumu
echo "📦 PM2 kurulumu..."
sudo npm install -g pm2

echo "✅ PM2 kuruldu:"
pm2 --version

echo "🎉 Sunucu hazırlığı tamamlandı!"
echo "📋 Sonraki adım: PostgreSQL yapılandırması"
