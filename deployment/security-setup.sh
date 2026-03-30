#!/bin/bash

# Güvenlik Sertleştirme
# Bu script VM içinde root olarak çalıştırılacak

if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script root olarak çalıştırılmalıdır"
    exit 1
fi

echo "🔒 Güvenlik Sertleştirme Başlatılıyor..."

# Fail2Ban yapılandırması
echo "🛡️  Fail2Ban yapılandırılıyor..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = ufw

[sshd]
enabled = true
port = 22
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
findtime = 300
bantime = 86400
EOF

# Fail2Ban filtreleri
cat > /etc/fail2ban/filter.d/nginx-noscript.conf << EOF
[Definition]
failregex = ^<HOST> -.*GET.*(\.php|\.asp|\.cgi|\.sh|\.pl|\.py|\.rb|\.exe|\.bat|\.cmd).* HTTP.* 40[0-4]
ignoreregex =
EOF

cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << EOF
[Definition]
failregex = ^.*limiting request, exceeding.*client: <HOST>.*
ignoreregex =
EOF

# Fail2Ban'ı başlat
systemctl enable fail2ban
systemctl restart fail2ban

echo "✅ Fail2Ban yapılandırıldı"

# SSH güvenliği
echo "🔐 SSH güvenliği güçlendiriliyor..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# SSH config güncelle
cat > /etc/ssh/sshd_config.d/99-security.conf << EOF
# SSH Security Configuration
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 20
Protocol 2
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitEmptyPasswords no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# SSH restart
systemctl restart sshd

echo "✅ SSH güvenliği güçlendirildi"

# Otomatik güvenlik güncellemeleri
echo "🔄 Otomatik güvenlik güncellemeleri ayarlanıyor..."
dpkg-reconfigure -f noninteractive unattended-upgrades

# Unattended upgrades config
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}:\${distro_codename}-updates";
};
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo "✅ Otomatik güncellemeler ayarlandı"

# Sistem log rotation
echo "📝 Log rotation ayarlanıyor..."
cat > /etc/logrotate.d/omega << EOF
/home/omega/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 omega omega
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo "🔒 Güvenlik sertleştirme tamamlandı!"
echo "📋 Durum kontrolü:"
echo "   fail2ban-client status"
echo "   systemctl status sshd"
echo "   tail -f /var/log/fail2ban.log"
