#!/bin/bash

# PM2 ile Servisleri Başlat
# Bu script VM içinde omega kullanıcısı olarak çalıştırılacak

echo "🚀 PM2 Servisleri Başlatılıyor..."

# Omega kullanıcısı kontrolü
if [ "$(whoami)" != "omega" ]; then
    echo "❌ Bu script omega kullanıcısı olarak çalıştırılmalıdır"
    exit 1
fi

cd /home/omega/omega

# Backend başlat
echo "🔧 Backend servisi başlatılıyor..."
pm2 start backend/dist/app.js \
  --name omega-api \
  --max-memory-restart 400M \
  --env production

# PM2 log rotation kurulumu
echo "📝 PM2 log rotation kuruluyor..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7

# PM2'yi sistem başlangıcına ekle
echo "🔧 PM2 sistem başlangıcına ekleniyor..."
pm2 save
pm2 startup

echo "📋 PM2 startup komutu (root olarak çalıştır):"
pm2 startup | grep "sudo"

# Durum kontrolü
echo "🔍 Servis durumu:"
pm2 status

echo "📝 Log kontrolü (ilk 50 satır):"
pm2 logs omega-api --lines 50

echo "✅ PM2 servisleri başlatıldı!"
echo "📋 Sonraki adım: Nginx yapılandırması"
