#!/bin/bash

# SSL Sertifikası Kurulumu
# Bu script VM içinde root olarak çalıştırılacak

if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script root olarak çalıştırılmalıdır"
    exit 1
fi

echo "🔒 SSL Sertifikası Kurulumu Başlatılıyor..."

# Domain adını al
read -p "🔗 CMS domain adını gir (örn: cms.omega.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain adı zorunludur"
    exit 1
fi

echo "⏳ DNS kontrolü bekleniyor..."
echo "🔍 Domain: $DOMAIN"
echo "📋 DNS'te A kaydı olmalı: $DOMAIN → ORACLE_PUBLIC_IP"
echo ""
read -p "DNS yayıldı mı? (e/H): " dns_ready

if [ "$dns_ready" != "e" ]; then
    echo "❌ DNS yayılana kadar devam edilemez"
    exit 1
fi

# SSL sertifikası al
echo "🔒 SSL sertifikası alınıyor..."
certbot --nginx -d $DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ SSL sertifikası alındı"
else
    echo "❌ SSL sertifikası alınamadı"
    exit 1
fi

# Otomatik yenileme test et
echo "🔄 Otomatik yenileme test ediliyor..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo "✅ Otomatik yenileme çalışıyor"
else
    echo "⚠️  Otomatik yenileme test edilemedi"
fi

# Cron kontrolü
echo "📅 Cron kontrolü..."
if crontab -l | grep -q "certbot renew"; then
    echo "✅ Certbot cron zaten ayarlanmış"
else
    echo "⚠️  Certbot cron ayarlanmamış olabilir"
    echo "🔧 Manuel olarak ekleyebilirsiniz:"
    echo "   sudo crontab -e"
    echo "   0 12 * * * /usr/bin/certbot renew --quiet"
fi

# Nginx restart
systemctl reload nginx

echo "🔒 SSL kurulumu tamamlandı!"
echo "🌐 Site: https://$DOMAIN"
echo "📋 Sonraki adım: Güvenlik sertleştirme"
