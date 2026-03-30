import { state, getOrder } from '../data/state'
import { successResponses, errorResponses } from '../utils/xmlResponse'

export async function handleCheckStatus(username: string, password: string, orderNo: string): Promise<string> {
  // Simüle edilmiş gecikme
  await new Promise(resolve => setTimeout(resolve, state.latency))

  // Senaryo kontrolü
  if (state.scenario === 'maintenance') {
    return errorResponses.maintenance
  }

  // Credential kontrolü
  if (!username || !password) {
    return errorResponses.userNotFound
  }

  // Sipariş bulma
  const order = getOrder(orderNo)
  if (!order) {
    return errorResponses.orderNotFound
  }

  // Durum açıklaması
  const statusDescriptions: Record<string, string> = {
    '000': 'Siparişiniz Tamamlandı',
    '001': 'Siparişiniz İşleniyor',
    '002': 'Siparişiniz Beklemede'
  }

  const checkDate = order.createdAt.toISOString().replace(/T/, ' ').slice(0, 19)

  // XML response döndür
  return successResponses.checkStatus(
    orderNo,
    order.status,
    statusDescriptions[order.status] || 'Bilinmeyen Durum',
    checkDate
  )
}
