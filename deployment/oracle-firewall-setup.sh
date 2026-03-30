#!/bin/bash

# Oracle Cloud Ubuntu Firewall Setup
# Bu script VM içinde çalıştırılacak

echo "🔥 Oracle Cloud Firewall Setup Başlatılıyor..."

# UFW varsayılan kurallar
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Gerekli portları aç
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# UFW'yi etkinleştir
sudo ufw --force enable

# Oracle'ın varsayılan iptables kurallarını temizle
sudo iptables -F
sudo iptables -P INPUT ACCEPT
sudo netfilter-persistent save

echo "✅ Firewall kurulumu tamamlandı"
echo "🔍 Durum kontrolü:"
sudo ufw status verbose

echo ""
echo "📋 Açık portlar:"
sudo ufw status numbered
