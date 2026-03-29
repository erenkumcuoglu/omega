// Mock data for all screens
export const mockProviders = [
  {
    id: '1',
    name: 'Turkpin',
    apiKey: 'tp_live_abc123def456',
    isActive: true,
    orders: 1250,
    codesDelivered: 1180,
    successRate: 98.5,
    revenue: 125000,
    deliveryEnabled: true
  },
  {
    id: '2',
    name: 'Coda',
    apiKey: 'cd_live_xyz789uvw012',
    isActive: true,
    orders: 980,
    codesDelivered: 950,
    successRate: 96.8,
    revenue: 98000,
    deliveryEnabled: true
  }
]

export const mockChannels = [
  {
    id: 'trendyol',
    name: 'Trendyol',
    country: '',
    isActive: true,
    orders: 2283,
    revenue: 271000,
    commission: 8.5,
    performance: 92,
    costPrice: 245000, // Maliyet fiyatı
    profit: 26000 // Kar = Ciro - Maliyet
  },
  {
    id: 'ozan',
    name: 'Ozan',
    country: '',
    isActive: true,
    orders: 1516,
    revenue: 151600,
    commission: 12.0,
    performance: 88,
    costPrice: 135000,
    profit: 16600
  },
  {
    id: 'migros',
    name: 'Migros',
    country: '',
    isActive: true,
    orders: 505,
    revenue: 50500,
    commission: 10.0,
    performance: 95,
    costPrice: 45000,
    profit: 5500
  },
  {
    id: 'daraz',
    name: 'Daraz',
    country: 'PK',
    isActive: true,
    orders: 30,
    revenue: 50000,
    commission: 15.0,
    performance: 78,
    costPrice: 42000,
    profit: 8000
  },
  {
    id: 'allegro',
    name: 'Allegro',
    country: '',
    isActive: true,
    orders: 20,
    revenue: 40000,
    commission: 12.5,
    performance: 85,
    costPrice: 35000,
    profit: 5000
  },
  {
    id: 'ozon',
    name: 'Ozon',
    country: '',
    isActive: true,
    orders: 10,
    revenue: 10000,
    commission: 18.0,
    performance: 70
  }
]

export const mockOrders = [
  {
    id: 'ORD-001',
    date: new Date('2026-03-28T14:30:00'),
    channel: 'Trendyol',
    provider: 'Coda',
    customer: 'Ahmet Yılmaz',
    product: 'PUBG Mobile 100 TL',
    distPrice: 85,
    salePrice: 100,
    digitalCode: 'PUBG-100-ABCD1234-EFGH5678-IJKL9012-MNOP3456',
    productCode: 'PUBG-100-TR',
    status: 'completed'
  },
  {
    id: 'ORD-002',
    date: new Date('2026-03-28T14:25:00'),
    channel: 'Ozan',
    provider: 'Epin',
    customer: 'Ayşe Demir',
    product: 'Valorant 500 TL',
    distPrice: 425,
    salePrice: 500,
    digitalCode: 'VAL-500-QWERT1234-ASDF5678-ZXCV9012-YUIO3456',
    productCode: 'VAL-500-TR',
    status: 'pending'
  },
  {
    id: 'ORD-003',
    date: new Date('2026-03-28T14:20:00'),
    channel: 'Migros',
    provider: 'Martı',
    customer: 'Mehmet Kaya',
    product: 'Minecraft 200 TL',
    distPrice: 170,
    salePrice: 200,
    digitalCode: '',
    productCode: 'MINE-200-TR',
    status: 'cancelled'
  },
  {
    id: 'ORD-004',
    date: new Date('2026-03-28T14:15:00'),
    channel: 'Trendyol',
    provider: 'Coda',
    customer: 'Fatma Özkan',
    product: 'CS:GO 150 TL',
    distPrice: 127.5,
    salePrice: 150,
    digitalCode: 'CSGO-150-YUIO1234-ASDF5678-QWERT9012-ZXCV3456',
    productCode: 'CSGO-150-TR',
    status: 'completed'
  },
  {
    id: 'ORD-005',
    date: new Date('2026-03-28T14:10:00'),
    channel: 'Ozan',
    provider: 'Epin',
    customer: 'Ali Vural',
    product: 'FIFA 2025 300 TL',
    distPrice: 255,
    salePrice: 300,
    digitalCode: 'FIFA-300-MNBV1234-HJKL5678-POIU9012-TREW3456',
    productCode: 'FIFA-300-TR',
    status: 'completed'
  },
  {
    id: 'ORD-006',
    date: new Date('2026-03-28T14:05:00'),
    channel: 'Daraz',
    provider: 'Coda',
    customer: 'Zeynep Çelik',
    product: 'PUBG Mobile 100 TL',
    distPrice: 85,
    salePrice: 100,
    digitalCode: 'PUBG-100-POIU1234-YTRE5678-MNBV9012-CVBN3456',
    productCode: 'PUBG-100-PK',
    status: 'pending'
  },
  {
    id: 'ORD-007',
    date: new Date('2026-03-28T14:00:00'),
    channel: 'Trendyol',
    provider: 'Martı',
    customer: 'Mustafa Aksoy',
    product: 'League of Legends 250 TL',
    distPrice: 212.5,
    salePrice: 250,
    digitalCode: '',
    productCode: 'LOL-250-TR',
    status: 'pending'
  },
  {
    id: 'ORD-008',
    date: new Date('2026-03-28T13:55:00'),
    channel: 'Migros',
    provider: 'Epin',
    customer: 'Elif Korkmaz',
    product: 'Rocket League 100 TL',
    distPrice: 85,
    salePrice: 100,
    digitalCode: 'RL-100-CVBN1234-NMOP5678-IUYT9012-REWA3456',
    productCode: 'RL-100-TR',
    status: 'completed'
  }
]

export const mockProducts = {
  turkpin: [
    {
      product: 'PUBG Mobile',
      denoms: [
        { id: '1', denom: '60 UC', purchasePrice: 50, salePrice: 60, margin: 10, stock: 120, isActive: true },
        { id: '2', denom: '125 UC', purchasePrice: 105, salePrice: 125, margin: 16.7, stock: 85, isActive: true },
        { id: '3', denom: '300 UC', purchasePrice: 250, salePrice: 300, margin: 16.7, stock: 45, isActive: true },
        { id: '4', denom: '600 UC', purchasePrice: 500, salePrice: 600, margin: 16.7, stock: 30, isActive: true },
        { id: '5', denom: '1500 UC', purchasePrice: 1250, salePrice: 1500, margin: 16.7, stock: 15, isActive: true }
      ]
    },
    {
      product: 'Valorant',
      denoms: [
        { id: '6', denom: '100 Points', purchasePrice: 85, salePrice: 100, margin: 15, stock: 95, isActive: true },
        { id: '7', denom: '200 Points', purchasePrice: 170, salePrice: 200, margin: 15, stock: 60, isActive: true },
        { id: '8', denom: '400 Points', purchasePrice: 340, salePrice: 400, margin: 15, stock: 35, isActive: true },
        { id: '9', denom: '800 Points', purchasePrice: 680, salePrice: 800, margin: 15, stock: 20, isActive: true }
      ]
    },
    {
      product: 'League of Legends',
      denoms: [
        { id: '10', denom: '100 RP', purchasePrice: 85, salePrice: 100, margin: 15, stock: 150, isActive: true },
        { id: '11', denom: '200 RP', purchasePrice: 170, salePrice: 200, margin: 15, stock: 80, isActive: true },
        { id: '12', denom: '400 RP', purchasePrice: 340, salePrice: 400, margin: 15, stock: 40, isActive: true },
        { id: '13', denom: '800 RP', purchasePrice: 680, salePrice: 800, margin: 15, stock: 25, isActive: true }
      ]
    },
    {
      product: 'CS:GO',
      denoms: [
        { id: '14', denom: '100 TL', purchasePrice: 85, salePrice: 100, margin: 15, stock: 200, isActive: true },
        { id: '15', denom: '200 TL', purchasePrice: 170, salePrice: 200, margin: 15, stock: 120, isActive: true },
        { id: '16', denom: '400 TL', purchasePrice: 340, salePrice: 400, margin: 15, stock: 70, isActive: true }
      ]
    }
  ],
  coda: [
    {
      product: 'PUBG Mobile',
      denoms: [
        { id: '17', denom: '60 UC', purchasePrice: 52, salePrice: 60, margin: 13.3, stock: 100, isActive: true },
        { id: '18', denom: '125 UC', purchasePrice: 108, salePrice: 125, margin: 13.6, stock: 75, isActive: true },
        { id: '19', denom: '300 UC', purchasePrice: 260, salePrice: 300, margin: 13.3, stock: 40, isActive: true },
        { id: '20', denom: '600 UC', purchasePrice: 520, salePrice: 600, margin: 13.3, stock: 25, isActive: true }
      ]
    },
    {
      product: 'Valorant',
      denoms: [
        { id: '21', denom: '100 Points', purchasePrice: 87, salePrice: 100, margin: 13, stock: 85, isActive: true },
        { id: '22', denom: '200 Points', purchasePrice: 174, salePrice: 200, margin: 13, stock: 55, isActive: true },
        { id: '23', denom: '400 Points', purchasePrice: 348, salePrice: 400, margin: 13, stock: 30, isActive: true }
      ]
    },
    {
      product: 'Minecraft',
      denoms: [
        { id: '24', denom: '100 TL', purchasePrice: 87, salePrice: 100, margin: 13, stock: 60, isActive: true },
        { id: '25', denom: '200 TL', purchasePrice: 174, salePrice: 200, margin: 13, stock: 35, isActive: true }
      ]
    },
    {
      product: 'Rocket League',
      denoms: [
        { id: '26', denom: '100 TL', purchasePrice: 88, salePrice: 100, margin: 12, stock: 110, isActive: true },
        { id: '27', denom: '200 TL', purchasePrice: 176, salePrice: 200, margin: 12, stock: 65, isActive: true },
        { id: '28', denom: '400 TL', purchasePrice: 352, salePrice: 400, margin: 12, stock: 30, isActive: true }
      ]
    }
  ]
}

export const mockStockAlerts = [
  {
    id: '1',
    productId: '2',
    productName: 'Valorant 500 TL',
    provider: 'epin',
    currentStock: 8,
    threshold: 50,
    alertType: 'low_stock',
    createdAt: new Date('2026-03-28T10:00:00')
  },
  {
    id: '2',
    productId: '3',
    productName: 'Minecraft 200 TL',
    provider: 'marti',
    currentStock: 0,
    threshold: 25,
    alertType: 'out_of_stock',
    createdAt: new Date('2026-03-28T09:30:00')
  }
]

export const mockExcessCodes = [
  {
    id: 'EXC-001',
    productId: '1',
    productName: 'PUBG Mobile 100 TL',
    channel: 'Trendyol',
    provider: 'coda',
    orderId: 'ORD-12345',
    createdAt: new Date('2026-03-28T14:30:00'),
    status: 'pending',
    code: 'PUBG-100-EXTRA1234-EXTRA5678-EXTRA9012-EXTRA3456'
  },
  {
    id: 'EXC-002',
    productId: '2',
    productName: 'Valorant 500 TL',
    channel: 'Ozan',
    provider: 'epin',
    orderId: 'ORD-12346',
    createdAt: new Date('2026-03-28T14:25:00'),
    status: 'pending',
    code: 'VAL-500-EXTRA1234-EXTRA5678-EXTRA9012-EXTRA3456'
  }
]

export const mockSystemHealth = {
  turkpinBalance: 996501.23,
  lastUpdate: new Date('2026-03-28T16:20:00'),
  queueMetrics: {
    waiting: 0,
    active: 2,
    failed: 0
  },
  webhookStats: {
    trendyol: { received: 320, completed: 318, failed: 1, duplicate: 1, blocked: 0 },
    ozan: { received: 180, completed: 179, failed: 0, duplicate: 1, blocked: 0 },
    migros: { received: 90, completed: 90, failed: 0, duplicate: 0, blocked: 0 }
  }
}

// Operasyon başlangıç tarihinden itibaren geçen aylar ve yıllar
const getOperationalMonthsAndYears = () => {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Operasyon başlangıç: Mart 2026
  const operationalStartYear = 2026
  const operationalStartMonth = 2 // Mart (0-indexed)
  
  const availableMonths = []
  
  // Operasyon başlangıç yılından mevcut yıla kadar
  for (let year = operationalStartYear; year <= currentYear; year++) {
    const startMonth = (year === operationalStartYear) ? operationalStartMonth : 0
    const endMonth = (year === currentYear) ? currentMonth : 11
    
    for (let month = startMonth; month <= endMonth; month++) {
      availableMonths.push(`${months[month]} ${year}`)
    }
  }
  
  return availableMonths
}

// Operasyon başlangıcından itibaren geçen yıllar
const getOperationalYears = () => {
  const currentYear = new Date().getFullYear()
  const operationalStartYear = 2026
  
  const availableYears = []
  for (let year = operationalStartYear; year <= currentYear; year++) {
    availableYears.push(year)
  }
  
  return availableYears
}

export const months = getOperationalMonthsAndYears()
export const activeMonth = months[months.length - 1] // En son ay (mevcut ay)
export const years = getOperationalYears().map(year => year.toString())
export const activeYear = new Date().getFullYear().toString()
