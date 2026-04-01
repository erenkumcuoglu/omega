import xml2js from 'xml2js'

const username = 'eren@omegadijital.com'
const password = 'ErenYamaha11#.'
const baseUrl = 'https://www.turkpin.com/api.php'

const parser = new xml2js.Parser({ explicitArray: false })

const buildXml = (cmd, params = {}) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<APIRequest>
  <params>
    <username>${username}</username>
    <password>${password}</password>
    <cmd>${cmd}</cmd>`

  for (const [key, value] of Object.entries(params)) {
    xml += `\n    <${key}>${value}</${key}>`
  }

  xml += `
  </params>
</APIRequest>`

  return xml
}

const testCommand = async (cmd, params = {}) => {
  try {
    console.log(`\n=== Testing ${cmd} ===`)

    const xml = buildXml(cmd, params)
    console.log('XML Request:', xml)

    const formData = new URLSearchParams()
    formData.append('DATA', xml)

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    })

    console.log('Response status:', response.status)
    const responseText = await response.text()
    console.log('Response text:', responseText)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await parser.parseStringPromise(responseText)
    console.log('Parsed result:', JSON.stringify(result, null, 2))

    const data = result.APIResponse || result.response || result

    if (data.params && data.params.HATA_NO && data.params.HATA_NO !== '000') {
      console.error('API Error:', data.params.HATA_NO, data.params.HATA_ACIKLAMA || 'Unknown error')
      return null
    }

    console.log('✅ Command successful')
    return data.params

  } catch (error) {
    console.error('❌ Command failed:', error.message)
    return null
  }
}

const runTests = async () => {
  // Test balance
  await testCommand('balance')

  // Test different command names
  const commandsToTest = [
    'epinList', 'epin_list', 'gameList', 'game_list', 'games',
    'goldGameList', 'gold_game_list', 'goldList', 'gold_list',
    'epinGames', 'epin_games', 'goldGames', 'gold_games',
    'listGames', 'list_games', 'getGames', 'get_games'
  ]

  for (const cmd of commandsToTest) {
    await testCommand(cmd)
  }
}

runTests()