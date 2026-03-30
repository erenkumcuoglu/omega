import { state, SandboxOrder, addOrder } from '../data/state'
import { findProduct, updateStock } from '../data/products'
import { generateCode, successResponses, errorResponses } from '../utils/xmlResponse'

export async function handleEpinOrder(
  username: string, 
  password: string, 
  productId: string, 
  qty: number = 1
): Promise<string> {
  // Simüle edilmiş gecikme
  await new Promise(resolve => setTimeout(resolve, state.latency))

  // 1. Credential kontrol
  if (!username || !password) {
    return errorResponses.userNotFound
  }

  // 2. Senaryo kontrolleri
  if (state.scenario === 'maintenance') {
    return errorResponses.maintenance
  }

  if (state.scenario === 'insufficient_balance') {
    return errorResponses.insufficientBalance
  }

  if (state.scenario === 'out_of_stock' && productId === state.outOfStockProductId) {
    return errorResponses.outOfStock
  }

  // 3. Ürün stok kontrolü
  const product = findProduct(productId)
  if (!product) {
    return errorResponses.productNotFound
  }

  let currentStock = product.stock
  if (state.scenario === 'out_of_stock' && productId === state.outOfStockProductId) {
    currentStock = 0
  }

  if (currentStock < qty) {
    return errorResponses.outOfStock
  }

  // 4. Bakiye kontrolü
  const totalAmount = product.price * qty
  if (state.balance < totalAmount) {
    return errorResponses.insufficientBalance
  }

  // 5. Başarılı sipariş
  const orderNo = generateOrderNo()
  const codes = []
  
  for (let i = 0; i < qty; i++) {
    codes.push({
      code: generateCode(),
      desc: product.name
    })
  }

  // Stoktan düş
  if (!updateStock(productId, qty)) {
    return errorResponses.outOfStock
  }

  // Bakiyeden düş
  state.balance -= totalAmount
  state.spending += totalAmount

  // Sipariş kaydı oluştur
  const order: SandboxOrder = {
    orderNo,
    productId,
    productName: product.name,
    qty,
    unitPrice: product.price,
    totalAmount,
    codes,
    status: '000',
    createdAt: new Date()
  }

  addOrder(order)

  // XML response döndür
  return successResponses.order(orderNo, qty, codes)
}

// Sipariş numarası üretici
function generateOrderNo(): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0].slice(0, 8)
  const counter = Math.floor(Math.random() * 999) + 1
  return `SBX-${timestamp}-${counter.toString().padStart(3, '0')}`
}
