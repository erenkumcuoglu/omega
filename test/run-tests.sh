#!/bin/bash

# Omega Dijital Test Suite
# Tüm sistemleri test eder

echo "🧪 OMEGA DİJİTAL — TEST SUİTE"
echo "============================"

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}🧪 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test sonuçları
PASSED=0
FAILED=0

# Test fonksiyonu
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_test "$test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_success "$test_name"
        PASSED=$((PASSED + 1))
    else
        print_error "$test_name"
        FAILED=$((FAILED + 1))
    fi
}

echo ""
echo "1️⃣ WEBHOOK ENTEGRASYONLARI TEST"
echo "=============================="

# Backend'in çalışıp çalışmadığını kontrol et
run_test "Backend çalışıyor" "curl -s http://localhost:3003/api/system/health | grep -q healthy"

# Webhook endpoint'leri test
run_test "Trendyol webhook" "curl -s -X POST http://localhost:3003/api/webhooks/trendyol -H 'Content-Type: application/json' -d '{\"orderNumber\":\"TEST-001\"}' | grep -q success"

run_test "Hepsiburada webhook" "curl -s -X POST http://localhost:3003/api/webhooks/hepsiburada -H 'Content-Type: application/json' -d '{\"order\":{\"orderNumber\":\"HB-TEST-001\"}}' | grep -q success"

run_test "Allegro webhook" "curl -s -X POST http://localhost:3003/api/webhooks/allegro -H 'Content-Type: application/json' -d '{\"payload\":{\"orderId\":\"ALG-TEST-001\"}}' | grep -q success"

run_test "Daraz webhook" "curl -s -X POST http://localhost:3003/api/webhooks/daraz-lk -H 'Content-Type: application/json' -d '{\"data\":{\"order_id\":\"DRZ-TEST-001\"}}' | grep -q success"

echo ""
echo "2️⃣ DATABASE TEST"
echo "================="

# Database bağlantısı
run_test "PostgreSQL bağlantısı" "psql -U erenkumcuoglu -d omega_db -h localhost -c 'SELECT 1;'"

# SalesChannel kontrolü
run_test "SalesChannel verisi" "psql -U erenkumcuoglu -d omega_db -h localhost -c 'SELECT COUNT(*) FROM \"SalesChannel\";' | grep -q 4"

# Product kontrolü
run_test "Product verisi" "psql -U erenkumcuoglu -d omega_db -h localhost -c 'SELECT COUNT(*) FROM \"Product\";' | grep -q 3"

# Order tablosu kontrolü
run_test "Order tablosu mevcut" "psql -U erenkumcuoglu -d omega_db -h localhost -c 'SELECT COUNT(*) FROM \"Order\";'"

# Currency alanı kontrolü
run_test "Order currency alanı" "psql -U erenkumcuoglu -d omega_db -h localhost -c '\\d \"Order\"' | grep -q currency"

echo ""
echo "3️⃣ DEPLOYMENT SCRIPT'LERİ TEST"
echo "============================"

# Script'lerin varlığı
run_test "Deployment script'leri mevcut" "ls -la deployment/*.sh | wc -l | grep -q 17"

# Script'lerin çalıştırılabilirliği
run_test "Script'ler çalıştırılabilir" "find deployment/ -name '*.sh' -perm +111 | wc -l | grep -q 17"

# Yedekleme script'i kontrolü
run_test "Yedekleme script'i syntax OK" "bash -n deployment/backup-script.sh"

echo ""
echo "4️⃣ FRONTEND TEST"
echo "================"

# Frontend build kontrolü
if [ -d "frontend" ]; then
    run_test "Frontend klasörü mevcut" "test -d frontend"
    
    if [ -f "frontend/package.json" ]; then
        run_test "Frontend package.json mevcut" "test -f frontend/package.json"
        
        # Node modules kontrolü
        if [ -d "frontend/node_modules" ]; then
            run_test "Frontend node_modules mevcut" "test -d frontend/node_modules"
        else
            print_warning "Frontend node_modules yok (npm install gerekli)"
        fi
    else
        print_warning "Frontend package.json yok"
    fi
else
    print_warning "Frontend klasörü yok"
fi

echo ""
echo "5️⃣ DOSYA İZİNLERİ VE YAPILANDIRMA"
echo "=============================="

# .env dosyası kontrolü
if [ -f "backend/.env" ]; then
    run_test "Backend .env mevcut" "test -f backend/.env"
    
    # Kritik environment variable'lar
    run_test "DATABASE_URL tanımlı" "grep -q DATABASE_URL backend/.env"
    run_test "JWT_SECRET tanımlı" "grep -q JWT_SECRET backend/.env"
    run_test "TURKPIN_USERNAME tanımlı" "grep -q TURKPIN_USERNAME backend/.env"
else
    print_warning "Backend .env dosyası yok"
fi

echo ""
echo "6️⃣ SİSTEM KAYNAKLARI"
echo "=================="

# Disk alanı
DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_success "Disk kullanımı: ${DISK_USAGE}%"
    PASSED=$((PASSED + 1))
else
    print_error "Disk kullanımı yüksek: ${DISK_USAGE}%"
    FAILED=$((FAILED + 1))
fi

# Memory kontrolü
if command -v free &> /dev/null; then
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEMORY_USAGE" -lt 80 ]; then
        print_success "Memory kullanımı: ${MEMORY_USAGE}%"
        PASSED=$((PASSED + 1))
    else
        print_error "Memory kullanımı yüksek: ${MEMORY_USAGE}%"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""
echo "📊 TEST SONUÇLARI"
echo "================"
echo "✅ Başarılı: $PASSED"
echo "❌ Başarısız: $FAILED"
echo "📈 Toplam: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo ""
    print_success "TÜM TESTLER BAŞARILI! 🎉"
    echo "🚀 Production hazır!"
else
    echo ""
    print_error "$FAILED adet test başarısız"
    echo "🔧 Lütfen sorunları düzeltin"
fi

echo ""
echo "📋 ÖNERİLER"
echo "=========="

if [ ! -f "backend/.env" ]; then
    echo "• Backend .env dosyası oluşturun"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "• Frontend için: cd frontend && npm install"
fi

if [ "$FAILED" -gt 0 ]; then
    echo "• Başarısız testleri kontrol edin"
    echo "• Backend servisi çalışıyor mu: http://localhost:3003/api/system/health"
fi

echo ""
echo "🔧 Manuel test komutları:"
echo "• Webhook test: curl -X POST http://localhost:3003/api/webhooks/trendyol -H 'Content-Type: application/json' -d '{\"orderNumber\":\"TEST-001\"}'"
echo "• DB test: psql -U erenkumcuoglu -d omega_db -h localhost -c 'SELECT COUNT(*) FROM \"SalesChannel\";'"
echo "• Frontend build: cd frontend && npm run build"
