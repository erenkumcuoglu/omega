import { state, Scenario } from '../data/state'
import { successResponses, errorResponses } from '../utils/xmlResponse'

export async function handleBalance(username: string, password: string): Promise<string> {
  // Simüle edilmiş gecikme
  await new Promise(resolve => setTimeout(resolve, state.latency))

  // Senaryo kontrolü
  if (state.scenario === 'maintenance') {
    return errorResponses.maintenance
  }

  // Credential kontrolü (sandbox'ta her şey çalışır)
  if (!username || !password) {
    return errorResponses.userNotFound
  }

  // Başarılı response
  return successResponses.balance(
    state.balance,
    state.credit,
    state.bonus,
    state.spending
  )
}
