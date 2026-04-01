import xml2js from 'xml2js'

interface TurkpinBalance { balance: string; credit: string; bonus: string; spending: string }
interface TurkpinGame { id: string; name: string }
interface TurkpinProduct { id: string; name: string; stock: string; min_order: string; max_order: string; price: string }
interface TurkpinServer { id: string; name: string; min_order: string; max_order: string }
interface TurkpinOrderResult { status: string; order_no: string; total_amount: string; list: { code: string; desc: string }[] }
interface TurkpinOrderStatus { status_code: string; order_no: string; order_status_description: string; check_date: string; extra?: string }

const ERROR_MESSAGES: Record<number, string> = {
  1: "Kullanıcı adı veya şifre hatalı.",
  2: "IP adresinizden erişim izni yok.",
  6: "Bu hesap API kullanımına yetkili değil.",
  7: "Bu hesap API için aktif değil.",
  10: "Hatalı sipariş formatı.",
  11: "Ürün bulunamadı.",
  12: "Ürün stokta yok.",
  13: "Minimum sipariş adedi hatası.",
  14: "Bayi bakiyesi yetersiz.",
  18: "Maksimum sipariş adedi aşıldı.",
  22: "Bu ürün satın alınamıyor.",
  23: "Sistem bakımda, lütfen daha sonra tekrar deneyin.",
  99: "Sipariş bulunamadı.",
  111: "XML format hatası."
}

export class TurkpinClient {
  private username: string
  private password: string
  private baseUrl = 'https://www.turkpin.com/api.php'  // Live environment
  private parser = new xml2js.Parser({ explicitArray: false })
  private useMock = process.env.TURKPIN_USE_MOCK === 'true'

  constructor() {
    this.username = process.env.TURKPIN_USERNAME!
    this.password = process.env.TURKPIN_PASSWORD!
    console.log('Turkpin client initialized:', { username: this.username, password: this.password ? '***' : 'missing' })
  }

  private buildXml(cmd: string, params: Record<string, string>): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<APIRequest>
  <params>
    <username>${this.username}</username>
    <password>${this.password}</password>
    <cmd>${cmd}</cmd>`
    
    for (const [key, value] of Object.entries(params)) {
      xml += `\n    <${key}>${value}</${key}>`
    }
    
    xml += `
  </params>
</APIRequest>`
    
    return xml
  }

  private async request<T>(cmd: string, params: Record<string, string> = {}): Promise<T> {
    if (this.useMock) {
      return this.mockRequest<T>(cmd, params)
    }

    const xml = this.buildXml(cmd, params)
    
    const formData = new URLSearchParams()
    formData.append('DATA', xml)
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`)
    }

    const responseText = await response.text()
    console.log('Turkpin response:', responseText) // Debug için
    
    const result = await this.parser.parseStringPromise(responseText)
    
    const data = result.APIResponse || result.response || result
    
    if (!data) {
      throw new Error(`Invalid response format: ${responseText}`)
    }
    
    // Turkpin API error check - different error fields for different commands
    if (data.params) {
      // Balance command uses HATA_NO
      if (data.params.HATA_NO && data.params.HATA_NO !== '000') {
        const errorCode = parseInt(data.params.HATA_NO)
        const message = ERROR_MESSAGES[errorCode] || `API Hatası: ${data.params.HATA_ACIKLAMA || 'Bilinmeyen hata'}`
        throw new Error(message)
      }
      // Other commands use error
      if (data.params.error && data.params.error !== '000') {
        const errorCode = parseInt(data.params.error)
        const message = ERROR_MESSAGES[errorCode] || `API Hatası: ${data.params.error_desc || 'Bilinmeyen hata'}`
        throw new Error(message)
      }
    }

    // Return the params section which contains the actual data
    return data.params as T
  }

  private async mockRequest<T>(cmd: string, params: Record<string, string> = {}): Promise<T> {
    console.log('Mock request:', cmd, params)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    switch (cmd) {
      case 'balance':
        return {
          balance: '15420.50',
          credit: '5000.00',
          bonus: '250.00',
          spending: '12670.50'
        } as T
        
      case 'epinList':
        return [
          { id: '1', name: 'Steam' },
          { id: '2', name: 'PlayStation' },
          { id: '3', name: 'Xbox' },
          { id: '4', name: 'Nintendo' },
          { id: '5', name: 'Google Play' }
        ] as T
        
      case 'epinProducts':
        return [
          { id: 'steam-50', name: 'Steam 50 TL', stock: '150', min_order: '1', max_order: '10', price: '45.00' },
          { id: 'steam-100', name: 'Steam 100 TL', stock: '75', min_order: '1', max_order: '5', price: '90.00' },
          { id: 'ps-50', name: 'PlayStation 50 USD', stock: '50', min_order: '1', max_order: '3', price: '1850.00' }
        ] as T
        
      case 'goldGameList':
        return {
          categories: [
            { id: 'wow', name: 'World of Warcraft' },
            { id: 'lol', name: 'League of Legends' },
            { id: 'diablo', name: 'Diablo Immortal' }
          ]
        } as T
        
      case 'goldServerList':
        return {
          servers: [
            { id: 'server-1', name: 'Server EU', min_order: '100', max_order: '10000' },
            { id: 'server-2', name: 'Server US', min_order: '100', max_order: '5000' }
          ]
        } as T
        
      case 'epinOrder':
      case 'goldOrder':
        return {
          status: 'success',
          order_no: 'ORD-' + Date.now(),
          total_amount: '45.00',
          list: [
            { code: 'STEAM-CODE-' + Math.random().toString(36).substr(2, 9).toUpperCase(), desc: 'Steam Wallet Code' }
          ]
        } as T
        
      case 'checkOrderStatus':
        return {
          status_code: '1',
          order_no: params.orderNo,
          order_status_description: 'Sipariş tamamlandı',
          check_date: new Date().toISOString()
        } as T
        
      default:
        throw new Error(`Unknown command: ${cmd}`)
    }
  }

  async checkBalance(): Promise<TurkpinBalance> {
    if (this.useMock) {
      return this.mockRequest<TurkpinBalance>('balance')
    }

    const result = await this.request<{ balanceInformation: TurkpinBalance }>('balance')
    return result.balanceInformation
  }

  async epinList(): Promise<TurkpinGame[]> {
    if (this.useMock) {
      return this.mockRequest<TurkpinGame[]>('epinList')
    }

    const result = await this.request<{ oyunListesi: { oyun: TurkpinGame | TurkpinGame[] } }>('epinOyunListesi')
    
    if (!result.oyunListesi) {
      return []
    }

    const oyunListesi = result.oyunListesi.oyun
    if (Array.isArray(oyunListesi)) {
      return oyunListesi
    } else {
      return [oyunListesi]
    }
  }

  async epinProducts(gameId: string): Promise<TurkpinProduct[]> {
    if (this.useMock) {
      return this.mockRequest<TurkpinProduct[]>('epinProducts', { gameId })
    }

    const result = await this.request<{ epinUrunListesi: { urun: TurkpinProduct | TurkpinProduct[] } }>('epinUrunleri', { oyunKodu: gameId })
    
    if (!result.epinUrunListesi) {
      return []
    }

    const urunListesi = result.epinUrunListesi.urun
    if (Array.isArray(urunListesi)) {
      return urunListesi
    } else {
      return [urunListesi]
    }
  }

  async epinOrder(gameId: string, productId: string, qty: number, character?: string): Promise<TurkpinOrderResult> {
    const params: Record<string, string> = {
      epinId: gameId,
      productId,
      qty: qty.toString()
    }
    
    if (character) {
      params.character = character
    }
    
    return this.request<TurkpinOrderResult>('epinOrder', params)
  }

  async goldGameList(goldType?: number): Promise<TurkpinGame[]> {
    // Gold oyunları için sabit liste
    return [
      { id: 'wow', name: 'World of Warcraft' },
      { id: 'lol', name: 'League of Legends' },
      { id: 'diablo', name: 'Diablo Immortal' },
      { id: 'new-world', name: 'New World' },
      { id: 'lost-ark', name: 'Lost Ark' }
    ]
  }

  async goldServerList(gameId: string, goldType?: number): Promise<TurkpinServer[]> {
    // Oyun ID'sine göre sunucu listesi
    const serverMap: Record<string, TurkpinServer[]> = {
      'wow': [
        { id: 'wow-eu', name: 'World of Warcraft Europe', min_order: '100', max_order: '10000' },
        { id: 'wow-us', name: 'World of Warcraft US', min_order: '100', max_order: '5000' }
      ],
      'lol': [
        { id: 'lol-eu', name: 'League of Legends EU West', min_order: '50', max_order: '5000' },
        { id: 'lol-na', name: 'League of Legends NA', min_order: '50', max_order: '2500' }
      ],
      'diablo': [
        { id: 'diablo-global', name: 'Diablo Immortal Global', min_order: '100', max_order: '10000' }
      ]
    }

    return serverMap[gameId] || []
  }

  async goldOrder(gameId: string, productId: string, qty: number, character: string, goldType?: number): Promise<TurkpinOrderResult> {
    const params: Record<string, string> = {
      gameId,
      productId,
      qty: qty.toString(),
      character
    }
    
    if (goldType !== undefined) {
      params.goldType = goldType.toString()
    }
    
    return this.request<TurkpinOrderResult>('goldOrder', params)
  }

  async checkOrderStatus(orderNo: string): Promise<TurkpinOrderStatus> {
    return this.request<TurkpinOrderStatus>('checkOrderStatus', { orderNo })
  }
}

export const turkpinClient = new TurkpinClient()
