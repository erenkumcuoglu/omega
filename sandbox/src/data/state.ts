export type Scenario = 'normal' | 'out_of_stock' | 'insufficient_balance' | 'maintenance' | 'slow'

export interface SandboxOrder {
  orderNo: string
  productId: string
  productName: string
  qty: number
  unitPrice: number
  totalAmount: number
  codes: Array<{ code: string; desc: string }>
  status: string
  createdAt: Date
}

export interface SandboxState {
  // Bayi bakiyesi
  balance: number
  credit: number
  bonus: number
  spending: number

  // Sipariş geçmişi (checkStatus için)
  orders: Record<string, SandboxOrder>

  // Tetiklenecek senaryo
  scenario: Scenario

  // Hangi ürün stokta yok (senaryo için)
  outOfStockProductId: string

  // Yapay gecikme (ms) — ağ gecikmesini simüle etmek için
  latency: number
}

// Runtime'da değiştirilebilir state
export const state: SandboxState = {
  // Bayi bakiyesi
  balance: 50000.00,
  credit: 0,
  bonus: 0,
  spending: 0,

  // Sipariş geçmişi
  orders: {},

  // Senaryo
  scenario: 'normal',

  // Stokta olmayan ürün
  outOfStockProductId: '',

  // Gecikme
  latency: 300,
}

// State resetleme fonksiyonu
export function resetState(): void {
  state.balance = 50000.00
  state.credit = 0
  state.bonus = 0
  state.spending = 0
  state.orders = {}
  state.scenario = 'normal'
  state.outOfStockProductId = ''
  state.latency = 300
}

// Bakiye güncelleme
export function updateBalance(amount: number): void {
  state.balance = amount
}

// Senaryo güncelleme
export function updateScenario(scenario: Scenario, productId?: string, latency?: number): void {
  state.scenario = scenario
  if (productId) state.outOfStockProductId = productId
  if (latency) state.latency = latency
}

// Sipariş ekleme
export function addOrder(order: SandboxOrder): void {
  state.orders[order.orderNo] = order
}

// Sipariş getirme
export function getOrder(orderNo: string): SandboxOrder | undefined {
  return state.orders[orderNo]
}
