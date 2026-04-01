import { prisma } from './config/database';
import { createHash } from 'crypto';
import { UserRole } from '@omega/shared';

async function seed() {
  try {
    // Create admin user
    const passwordHash = createHash('sha256').update('admin123').digest('hex');
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@omega.com' },
      update: {},
      create: {
        email: 'admin@omega.com',
        name: 'Admin User',
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    console.log('✅ Admin user created:', admin.email);
    console.log('🔑 Password: admin123');
    
    // Create sample provider
    const provider = await prisma.provider.upsert({
      where: { id: 'provider-1' },
      update: {},
      create: {
        id: 'provider-1',
        name: 'Turkpin',
        type: 'API',
        isActive: true,
      },
    });

    console.log('✅ Provider created:', provider.name);

    // Create sample channel
    const channel = await prisma.salesChannel.upsert({
      where: { id: 'channel-1' },
      update: {},
      create: {
        id: 'channel-1',
        name: 'Trendyol',
        webhookIps: ['127.0.0.1'],
        commissionPct: 15,
        isActive: true,
      },
    });

    console.log('✅ Channel created:', channel.name);

    // Create sample product
    const product = await prisma.product.upsert({
      where: { id: 'product-1' },
      update: {},
      create: {
        id: 'product-1',
        providerId: provider.id,
        externalId: 'steam-100',
        name: 'Steam Wallet 100 TL',
        sku: 'STEAM100',
        purchasePrice: 95,
        sellingPrice: 100,
        marginPct: 5,
        stock: 100,
        isActive: true,
      },
    });

    console.log('✅ Product created:', product.name);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
