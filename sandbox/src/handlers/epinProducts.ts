import { state } from '../data/state'
import { findCategory, getCurrentStock } from '../data/products'
import { successResponses, errorResponses } from '../utils/xmlResponse'

export async function handleEpinProducts(username: string, password: string, epinId: string): Promise<string> {
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

  // Kategori bulma
  const category = findCategory(epinId)
  if (!category) {
    return errorResponses.productNotFound
  }

  // Ürünleri XML formatında döndür
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<result>\n'
  
  for (const product of category.products) {
    // Senaryo için stok kontrolü
    let currentStock = getCurrentStock(product.id)
    if (state.scenario === 'out_of_stock' && product.id === state.outOfStockProductId) {
      currentStock = 0
    }

    xml += `  <product>\n`
    xml += `    <id>${product.id}</id>\n`
    xml += `    <name>${product.name}</name>\n`
    xml += `    <price>${product.price.toFixed(4)}</price>\n`
    xml += `    <stock>${currentStock}</stock>\n`
    xml += `    <min_order>${product.minOrder}</min_order>\n`
    xml += `    <max_order>${product.maxOrder}</max_order>\n`
    xml += `  </product>\n`
  }
  
  xml += '</result>'
  return xml
}
