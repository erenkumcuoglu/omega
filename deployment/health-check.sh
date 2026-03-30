#!/bin/bash

# Deploy Sonrası Sağlık Kontrolü
# Bu script VM içinde çalıştırılır

echo "🔍 Omega Dijital Sağlık Kontrolü Başlatılıyor..."

# Domain adını al
read -p "🔗 CMS domain adını gir (örn: cms.omega.com): " DOMAIN

echo ""
echo "🚀 1/7 - Servis Kontrolü"
echo "=========================="

# PM2 durumu
echo "📊 PM2 durumu:"
if pm2 status | grep -q "omega-api.*online"; then
    echo "✅ PM2 omega-api çalışıyor"
else
    echo "❌ PM2 omega-api çalışmıyor"
fi

# Nginx durumu
echo "🌐 Nginx durumu:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx çalışıyor"
else
    echo "❌ Nginx çalışmıyor"
fi

# PostgreSQL durumu
echo "🐘 PostgreSQL durumu:"
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL çalışıyor"
else
    echo "❌ PostgreSQL çalışmıyor"
fi

# Redis durumu
echo "🔴 Redis durumu:"
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis çalışıyor"
else
    echo "❌ Redis çalışmıyor"
fi

echo ""
echo "🌐 2/7 - Uygulama Kontrolü"
echo "==========================="

# API health check
echo "🔍 API health check:"
if curl -s "https://$DOMAIN/api/system/health" | grep -q "healthy"; then
    echo "✅ API health endpoint çalışıyor"
else
    echo "❌ API health endpoint çalışmıyor"
fi

# Frontend kontrolü
echo "🎨 Frontend kontrolü:"
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/" | grep -q "200"; then
    echo "✅ Frontend çalışıyor"
else
    echo "❌ Frontend çalışmıyor"
fi

echo ""
echo "🔒 3/7 - SSL Kontrolü"
echo "======================"

# SSL kontrolü
echo "🔐 SSL sertifikası kontrolü:"
if curl -s -I "https://$DOMAIN" | grep -q "HTTP/2"; then
    echo "✅ SSL çalışıyor (HTTP/2)"
else
    echo "❌ SSL çalışmıyor"
fi

# SSL tarih kontrolü
if command -v openssl > /dev/null; then
    SSL_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    echo "📅 SSL expiry: $SSL_EXPIRY"
fi

echo ""
echo "🔐 4/7 - Güvenlik Kontrolü"
echo "=========================="

# Fail2ban durumu
echo "🛡️  Fail2ban durumu:"
if systemctl is-active --quiet fail2ban; then
    echo "✅ Fail2ban çalışıyor"
    echo "📊 Banlı IP'ler:"
    fail2ban-client status sshd | grep "Banned IP list"
else
    echo "❌ Fail2ban çalışmıyor"
fi

# Firewall durumu
echo "🔥 Firewall durumu:"
if ufw status | grep -q "Status: active"; then
    echo "✅ UFW aktif"
    echo "📋 Açık portlar:"
    ufw status numbered | grep "ALLOW"
else
    echo "❌ UFW aktif değil"
fi

echo ""
echo "📊 5/7 - Sistem Kaynakları"
echo "=========================="

# Disk kullanımı
echo "💾 Disk kullanımı:"
df -h | grep -E "/$|/home"

# RAM kullanımı
echo "🧠 RAM kullanımı:"
free -h

# CPU load
echo "⚡ CPU load:"
uptime

echo ""
echo "📝 6/7 - Log Kontrolü"
echo "======================"

# PM2 log'ları
echo "📊 PM2 log'ları (son 10 satır):"
pm2 logs omega-api --lines 10 | tail -10

# Nginx hataları
echo "🌐 Nginx hataları (son 5 satır):"
if [ -f /var/log/nginx/omega-cms-error.log ]; then
    tail -5 /var/log/nginx/omega-cms-error.log
else
    echo "Nginx error log bulunamadı"
fi

echo ""
echo "🔧 7/7 - Öneriler"
echo "=================="

# Öneriler
echo "💡 Bakım önerileri:"
echo "   - Haftada bir: pg_dump -U omega omega_db > backup_\$(date +%Y%m%d).sql"
echo "   - Logları izle: pm2 logs omega-api --follow"
echo "   - Sistem monitör: pm2 monit"
echo "   - Disk temizliği: sudo apt autoremove && sudo apt autoclean"

echo ""
echo "🎉 Sağlık kontrolü tamamlandı!"
echo "📋 Tüm sistemler çalışıyorsa production hazır!"
