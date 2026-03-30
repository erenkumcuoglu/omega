import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || 'postgresql://erenkumcuoglu:@localhost:5432/omega_db'
})

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error']
})

async function main() {
  console.log('🌱 Seed başlatılıyor...')

  // Provider'ları temizle ve oluştur
  await prisma.provider.deleteMany()
  
  const providers = await Promise.all([
    prisma.provider.create({
      data: {
        name: 'Coda',
        type: 'API',
        apiUsername: 'coda_api',
        apiPasswordEnc: 'encrypted_password'
      }
    }),
    prisma.provider.create({
      data: {
        name: 'Epin',
        type: 'API',
        apiUsername: 'epin_api',
        apiPasswordEnc: 'encrypted_password'
      }
    }),
    prisma.provider.create({
      data: {
        name: 'Martı',
        type: 'STOCK'
      }
    })
  ])

  console.log('✅ Provider\'lar oluşturuldu:', providers.map((p: any) => p.name))

  // Satış kanallarını temizle ve oluştur
  await prisma.salesChannel.deleteMany()
  
  const channels = await Promise.all([
    prisma.salesChannel.create({
      data: {
        name: 'Trendyol',
        commissionPct: 8.5,
        webhookIps: ['sandbox']
      }
    }),
    prisma.salesChannel.create({
      data: {
        name: 'Hepsiburada',
        commissionPct: 10.0,
        webhookIps: ['sandbox']
      }
    }),
    prisma.salesChannel.create({
      data: {
        name: 'Allegro',
        countryCode: null,
        commissionPct: 5.5,
        webhookIps: ['sandbox']
      }
    }),
    prisma.salesChannel.create({
      data: {
        name: 'Daraz',
        countryCode: 'LK',
        commissionPct: 6.0,
        webhookIps: ['sandbox']
      }
    })
  ])

  console.log('✅ Satış kanalları oluşturuldu:', channels.map((c: any) => c.name))

  // Ürünleri temizle ve oluştur
  await prisma.product.deleteMany()
  
  const products = await Promise.all([
    prisma.product.create({
      data: {
        providerId: providers[0].id, // Coda
        externalId: 'PUBGMTR60',
        name: 'PUBG Mobile 60 UC',
        sku: 'PUBGMTR60',
        purchasePrice: 50,
        sellingPrice: 100,
        marginPct: 50,
        stock: 100,
        isActive: true
      }
    }),
    prisma.product.create({
      data: {
        providerId: providers[0].id, // Coda
        externalId: 'PUBGMTR325',
        name: 'PUBG Mobile 325 UC',
        sku: 'PUBGMTR325',
        purchasePrice: 75,
        sellingPrice: 135,
        marginPct: 44.44,
        stock: 50,
        isActive: true
      }
    }),
    prisma.product.create({
      data: {
        providerId: providers[0].id, // Coda
        externalId: 'VALTR1000',
        name: 'Valorant 1000 RP',
        sku: 'VALTR1000',
        purchasePrice: 60,
        sellingPrice: 95,
        marginPct: 36.84,
        stock: 75,
        isActive: true
      }
    })
  ])

  console.log('✅ Ürünler oluşturuldu:', products.map((p: any) => `${p.sku} (${p.stock} adet)`))

  // Admin kullanıcıyı temizle ve oluştur
  await prisma.user.deleteMany()
  
  const hashedPassword = await bcrypt.hash('Admin123!', 12)
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@omega.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      forcePasswordChange: false
    }
  })

  console.log('✅ Admin kullanıcı oluşturuldu:', adminUser.email)

  console.log('🎉 Seed tamamlandı!')
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
