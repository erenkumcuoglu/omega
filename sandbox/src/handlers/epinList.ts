import { state } from '../data/state'
import { categories } from '../data/products'
import { successResponses, errorResponses } from '../utils/xmlResponse'

export async function handleEpinList(username: string, password: string): Promise<string> {
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

  // Kategorileri XML formatında döndür
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<result>\n'
  
  for (const category of categories) {
    xml += `  <category>\n`
    xml += `    <id>${category.id}</id>\n`
    xml += `    <name>${category.name}</name>\n`
    xml += `    <productCount>${category.products.length}</productCount>\n`
    xml += `  </category>\n`
  }
  
  xml += '</result>'
  return xml
}
