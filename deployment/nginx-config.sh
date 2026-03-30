#!/bin/bash

# Nginx Yapılandırması
# Bu script VM içinde root olarak çalıştırılacak

if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script root olarak çalıştırılmalıdır"
    exit 1
fi

echo "🌐 Nginx Yapılandırması Başlatılıyor..."

# Domain adını al
read -p "🔗 CMS domain adını gir (örn: cms.omega.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain adı zorunludur"
    exit 1
fi

# Nginx config oluştur
cat > /etc/nginx/sites-available/omega-cms << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    # SSL — certbot dolduracak
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Güvenlik header'ları
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    server_tokens off;

    # Frontend static dosyalar
    root /home/omega/omega/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }

    # Webhook endpoint'leri
    location /api/webhooks/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }

    # Sistem sağlık endpoint'i
    location /api/system/health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Loglama
    access_log /var/log/nginx/omega-cms-access.log;
    error_log /var/log/nginx/omega-cms-error.log;
}
EOF

# Site'ı etkinleştir
ln -s /etc/nginx/sites-available/omega-cms /etc/nginx/sites-enabled/

# Nginx test et
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config başarılı"
    sudo systemctl reload nginx
else
    echo "❌ Nginx config hatası"
    exit 1
fi

echo "🌐 Nginx yapılandırması tamamlandı!"
echo "📋 Sonraki adım: SSL sertifikası (certbot)"
echo "🔗 Domain: $DOMAIN"
echo "⚠️  DNS'te A kaydı: $DOMAIN → ORACLE_PUBLIC_IP"
