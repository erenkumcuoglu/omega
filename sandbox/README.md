# Omega Digital - Turkpin Sandbox Mock Server

Turkpin'in gerçek XML API'sini birebir taklit eden local mock server.

## Kurulum

```bash
cd sandbox
npm install
npm run dev
```

Server port 3099'da başlar.

## Kullanım

Backend'de `.env` dosyasını güncelleyin:

```env
TURKPIN_API_URL=http://localhost:3099
TURKPIN_USERNAME=sandbox_user
TURKPIN_PASSWORD=sandbox_pass
```

## Kontrol Paneli

### Senaryo Değiştirme
```bash
curl -X POST http://localhost:3099/sandbox/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario":"out_of_stock","productId":"PUBGMTR60"}'
```

### State Sıfırlama
```bash
curl -X POST http://localhost:3099/sandbox/reset
```

### Durum Görüntüleme
```bash
curl http://localhost:3099/sandbox/state
```

### Bakiye Güncelleme
```bash
curl -X POST http://localhost:3099/sandbox/balance \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000}'
```

## Senaryolar

- `normal`: Normal çalışma
- `out_of_stock`: Stok tükenmesi simülasyonu
- `insufficient_balance`: Bakiye yetersizliği
- `maintenance`: Sistem bakımı
- `slow`: Yavaş bağlantı (latency parametresi ile)

## Ürün Kataloğu

- **PUBG Mobile**: 60 UC - 8100 UC (₺17.90 - ₺1790.00)
- **Valorant**: 475 VP - 11000 VP (₺32.00 - ₺640.00)
- **Minecraft**: Java Edition (₺436.00)
- **Steam**: 50 TL - 200 TL (₺49.00 - ₺196.00)
- **Google Play**: 25 TL - 100 TL (₺24.50 - ₺98.00)

## Test Senaryoları

1. **Başarılı Sipariş**: Normal modda sipariş ver
2. **Stok Tükenmesi**: `out_of_stock` senaryosu
3. **Bakiye Yetersiz**: `insufficient_balance` senaryosu
4. **Sistem Bakımı**: `maintenance` senaryosu
5. **Yavaş Bağlantı**: `slow` senaryosu

## API Endpoints

### Main Turkpin API
- `POST /` - Tüm Turkpin komutları

### Sandbox Control
- `POST /sandbox/scenario` - Senaryo değiştir
- `POST /sandbox/reset` - State sıfırla
- `GET /sandbox/state` - Durum görüntüle
- `POST /sandbox/balance` - Bakiye güncelle
