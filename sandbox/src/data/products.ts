export interface SandboxProduct {
  id: string
  sku: string
  name: string
  price: number
  stock: number
  minOrder: number
  maxOrder: number
  taxType: string[]
}

export interface SandboxCategory {
  id: string
  name: string
  products: SandboxProduct[]
}

// Gerçeğe yakın Türk oyun pazarı ürünleri (güncel fiyatlar - Mart 2026)
export const categories: SandboxCategory[] = [
  {
    id: "1",
    name: "PUBG Mobile",
    products: [
      {
        id: "PUBGMTR60",
        sku: "PUBGMTR60",
        name: "PUBG Mobile 60 UC",
        price: 25.90,
        stock: 500,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "PUBGMTR180",
        sku: "PUBGMTR180",
        name: "PUBG Mobile 180 UC",
        price: 75.90,
        stock: 300,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "PUBGMTR325",
        sku: "PUBGMTR325",
        name: "PUBG Mobile 325 UC",
        price: 135.90,
        stock: 150,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "PUBGMTR660",
        sku: "PUBGMTR660",
        name: "PUBG Mobile 660 UC",
        price: 269.90,
        stock: 100,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "PUBGMTR1800",
        sku: "PUBGMTR1800",
        name: "PUBG Mobile 1800 UC",
        price: 719.90,
        stock: 50,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "PUBGMTR3850",
        sku: "PUBGMTR3850",
        name: "PUBG Mobile 3850 UC",
        price: 1499.90,
        stock: 20,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "PUBGMTR8100",
        sku: "PUBGMTR8100",
        name: "PUBG Mobile 8100 UC",
        price: 3199.90,
        stock: 10,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  },
  {
    id: "2",
    name: "Valorant",
    products: [
      {
        id: "VALTR475",
        sku: "VALTR475",
        name: "Valorant 475 VP",
        price: 45.90,
        stock: 400,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "VALTR1000",
        sku: "VALTR1000",
        name: "Valorant 1000 VP",
        price: 95.90,
        stock: 200,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "VALTR2050",
        sku: "VALTR2050",
        name: "Valorant 2050 VP",
        price: 189.90,
        stock: 100,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "VALTR3650",
        sku: "VALTR3650",
        name: "Valorant 3650 VP",
        price: 329.90,
        stock: 30,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "VALTR5350",
        sku: "VALTR5350",
        name: "Valorant 5350 VP",
        price: 479.90,
        stock: 15,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "VALTR11000",
        sku: "VALTR11000",
        name: "Valorant 11000 VP",
        price: 959.90,
        stock: 5,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  },
  {
    id: "3",
    name: "Minecraft",
    products: [
      {
        id: "MCTR",
        sku: "MCTR",
        name: "Minecraft Java Edition",
        price: 599.90,
        stock: 80,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  },
  {
    id: "4",
    name: "Steam",
    products: [
      {
        id: "STEAMTR20",
        sku: "STEAMTR20",
        name: "Steam 20 TL",
        price: 21.90,
        stock: 2000,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "STEAMTR50",
        sku: "STEAMTR50",
        name: "Steam 50 TL",
        price: 54.90,
        stock: 1000,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "STEAMTR100",
        sku: "STEAMTR100",
        name: "Steam 100 TL",
        price: 109.90,
        stock: 800,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "STEAMTR250",
        sku: "STEAMTR250",
        name: "Steam 250 TL",
        price: 274.90,
        stock: 500,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  },
  {
    id: "5",
    name: "Google Play",
    products: [
      {
        id: "GPTR25",
        sku: "GPTR25",
        name: "Google Play 25 TL",
        price: 26.90,
        stock: 2000,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "GPTR50",
        sku: "GPTR50",
        name: "Google Play 50 TL",
        price: 53.90,
        stock: 1500,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "GPTR100",
        sku: "GPTR100",
        name: "Google Play 100 TL",
        price: 107.90,
        stock: 1000,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "GPTR200",
        sku: "GPTR200",
        name: "Google Play 200 TL",
        price: 215.90,
        stock: 500,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "GPTR500",
        sku: "GPTR500",
        name: "Google Play 500 TL",
        price: 539.90,
        stock: 200,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  },
  {
    id: "6",
    name: "Free Fire",
    products: [
      {
        id: "FFTR100",
        sku: "FFTR100",
        name: "Free Fire 100 Diamond",
        price: 15.90,
        stock: 1000,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "FFTR310",
        sku: "FFTR310",
        name: "Free Fire 310 Diamond",
        price: 47.90,
        stock: 500,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "FFTR520",
        sku: "FFTR520",
        name: "Free Fire 520 Diamond",
        price: 79.90,
        stock: 300,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "FFTR1050",
        sku: "FFTR1050",
        name: "Free Fire 1050 Diamond",
        price: 159.90,
        stock: 100,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  },
  {
    id: "7",
    name: "Mobile Legends",
    products: [
      {
        id: "MLTR86",
        sku: "MLTR86",
        name: "Mobile Legends 86 Diamonds",
        price: 12.90,
        stock: 1500,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "MLTR172",
        sku: "MLTR172",
        name: "Mobile Legends 172 Diamonds",
        price: 25.90,
        stock: 1000,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "MLTR257",
        sku: "MLTR257",
        name: "Mobile Legends 257 Diamonds",
        price: 37.90,
        stock: 800,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "MLTR344",
        sku: "MLTR344",
        name: "Mobile Legends 344 Diamonds",
        price: 49.90,
        stock: 500,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "MLTR516",
        sku: "MLTR516",
        name: "Mobile Legends 516 Diamonds",
        price: 74.90,
        stock: 300,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  },
  {
    id: "8",
    name: "Riot Points (LOL)",
    products: [
      {
        id: "LOLTR280",
        sku: "LOLTR280",
        name: "League of Legends 280 RP",
        price: 35.90,
        stock: 1000,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "LOLTR575",
        sku: "LOLTR575",
        name: "League of Legends 575 RP",
        price: 69.90,
        stock: 600,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "LOLTR1370",
        sku: "LOLTR1370",
        name: "League of Legends 1370 RP",
        price: 159.90,
        stock: 300,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      },
      {
        id: "LOLTR2800",
        sku: "LOLTR2800",
        name: "League of Legends 2800 RP",
        price: 319.90,
        stock: 150,
        minOrder: 1,
        maxOrder: 0,
        taxType: []
      }
    ]
  }
]

// Ürün bulma
export function findProduct(productId: string): SandboxProduct | undefined {
  for (const category of categories) {
    const product = category.products.find(p => p.id === productId)
    if (product) return product
  }
  return undefined
}

// Kategori bulma
export function findCategory(categoryId: string): SandboxCategory | undefined {
  return categories.find(c => c.id === categoryId)
}

// Stok güncelleme
export function updateStock(productId: string, quantity: number): boolean {
  const product = findProduct(productId)
  if (!product) return false
  
  if (product.stock < quantity) return false
  
  product.stock -= quantity
  return true
}

// Mevcut stok
export function getCurrentStock(productId: string): number {
  const product = findProduct(productId)
  return product ? product.stock : 0
}
