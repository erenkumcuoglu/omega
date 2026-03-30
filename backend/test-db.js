import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: 'postgresql://erenkumcuoglu:@localhost:5432/omega_db'
})

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error']
})

async function test() {
  try {
    await prisma.$connect()
    console.log('✅ DB bağlantısı başarılı')
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query başarılı:', result)
    
  } catch (error) {
    console.error('❌ DB hatası:', error)
  } finally {
    await prisma.$disconnect()
  }
}

test()
