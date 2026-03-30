#!/bin/bash

# Redis Yapılandırması
# Bu script VM içinde çalıştırılacak

echo "🔴 Redis Yapılandırması Başlatılıyor..."

# Rastgele Redis şifresi oluştur
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "🔐 Redis şifresi: $REDIS_PASSWORD"
echo "⚠️  Bu şifreyi .env dosyasında kullanacaksınız!"

# Redis config dosyasını güncelle
sudo sed -i "s/# bind 127.0.0.1 ::1/bind 127.0.0.1/" /etc/redis/redis.conf
sudo sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
sudo sed -i "s/# maxmemory <bytes>/maxmemory 128mb/" /etc/redis/redis.conf
sudo sed -i "s/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf

# Redis servisini başlat ve etkinleştir
sudo systemctl restart redis
sudo systemctl enable redis

# Redis bağlantısını test et
echo "🔍 Redis bağlantısı test ediliyor..."
if redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
    echo "✅ Redis bağlantısı başarılı"
else
    echo "❌ Redis bağlantısı başarısız"
    exit 1
fi

echo "🔴 Redis yapılandırması tamamlandı!"
echo "📋 Kullanılacak bilgiler:"
echo "   Host: 127.0.0.1"
echo "   Port: 6379"
echo "   Password: $REDIS_PASSWORD"
echo ""
echo "🔗 Bağlantı string: redis://:$REDIS_PASSWORD@127.0.0.1:6379"
