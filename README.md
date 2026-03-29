# Omega Digital

Dijital oyun kodu dağıtım sistemi - monorepo projesi.

## Proje Yapısı

```
omega/
├── apps/
│   ├── api/           # Node.js/Express Backend API
│   └── cms/           # React Frontend CMS
├── packages/
│   └── shared/        # Paylaşılan TypeScript tipleri
├── nginx/             # Nginx konfigürasyonları
├── docker-compose.yml         # Geliştirme ortamı
├── docker-compose.prod.yml    # Üretim ortamı
└── .env.example      # Ortam değişkenleri şablonu
```

## Özellikler

### Backend (Node.js + TypeScript)
- **Güvenlik**: IP whitelist, HMAC doğrulama, rate limiting, JWT auth
- **Veritabanı**: PostgreSQL 16 + Prisma ORM
- **Önbellek**: Redis 7
- **Kuyruk**: BullMQ ile asenkron işlemler
- **Loglama**: Pino ile yapılandırılmış loglama
- **API Entegrasyonu**: Turkpin provider servisi
- **Şifreleme**: AES-256-GCM ile hassas veri şifreleme

### Frontend (React + TypeScript)
- **Modern UI**: TailwindCSS + shadcn/ui bileşenleri
- **Durum Yönetimi**: React Query (TanStack Query)
- **Form Validasyonu**: React Hook Form + Zod
- **Toast Bildirimleri**: Sonner
- **Karanlık Tema**: Özelleştirilmiş karanlık tema
- **Responsive**: Mobil uyumlu tasarım

### Sayfalar
- **Ana Sayfa**: Dashboard ve istatistikler
- **Teslim Edilenler**: Sipariş geçmişi ve kod yönetimi
- **Fiyat Kontrol**: Ürün fiyatları ve kar marjları
- **Providerlar**: Oyun kodu sağlayıcıları
- **Satış Kanalları**: Pazar yeri yönetimi
- **Audit Log**: Sistem olayları ve güvenlik kayıtları
- **Sistem**: Sistem durumu ve performans metrikleri

## Kurulum

### 1. Ortam Değişkenleri
```bash
cp .env.example .env
# .env dosyasını düzenle
```

### 2. Geliştirme Ortamı
```bash
# Docker Compose ile tüm servisleri başlat
docker-compose up -d

# Veya manuel kurulum
npm install
npm run build:shared
npm run dev:api    # API: http://localhost:3000
npm run dev:cms    # CMS: http://localhost:3001
```

### 3. Veritabanı
```bash
# Prisma migration
npm run db:migrate

# Veritabanını doldur (opsiyonel)
npm run db:seed
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Giriş
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Mevcut kullanıcı

### Webhooks
- `POST /api/webhooks/trendyol` - Trendyol webhook
- `POST /api/webhooks/hepsiburada` - Hepsiburada webhook
- `POST /api/webhooks/ozan` - Ozan webhook

### Dashboard
- `GET /api/dashboard/summary` - Dashboard özeti

### Yönetim
- `GET /api/orders` - Siparişler
- `GET /api/products` - Ürünler
- `GET /api/providers` - Providerlar
- `GET /api/channels` - Satış kanalları
- `GET /api/audit-logs` - Audit kayıtları
- `GET /api/system/health` - Sistem durumu

## Güvenlik

### Network Güvenliği
- Cloudflare proxy koruması
- IP whitelist ile erişim kontrolü
- Nginx reverse proxy
- İç network erişim kısıtlamaları

### Uygulama Güvenliği
- HMAC ile webhook doğrulama
- JWT token-based authentication
- Rate limiting (Redis store)
- timingSafeEqual ile secret karşılaştırma
- Audit log ile tüm olayların kaydı

### Veri Güvenliği
- AES-256-GCM şifreleme
- Hassas verilerin şifreli saklanması
- Güvenli şifre hashing (bcrypt)

## Dağıtım

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
Production için gerekli ortam değişkenleri `.env.example` dosyasında belirtilmiştir.

## Test

```bash
# Unit testler
npm run test

# Integration testler
npm run test:integration

# Test coverage
npm run test:coverage
```

## Kod Kalitesi

- ESLint + TypeScript kuralları
- Prettier code formatting
- Husky pre-commit hooks
- Strict TypeScript modu
- Error handling best practices

## Lisans

MIT License
