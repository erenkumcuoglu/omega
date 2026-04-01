// Gerçekçi kod üretici: XXXX-XXXX-XXXX-XXXX formatında
export function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  
  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-'
    for (let j = 0; j < 4; j++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return code
}

// XML response builder
export function buildXMLResponse(data: any): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  
  if (data.error) {
    xml += '<result>\n'
    xml += `  <status>Error</status>\n`
    xml += `  <error_code>${data.error_code}</error_code>\n`
    xml += `  <error_message>${data.error_message}</error_message>\n`
    xml += '</result>'
  } else {
    xml += '<result>\n'
    
    // Balance response
    if (data.balance !== undefined) {
      xml += `  <balance>${data.balance.toFixed(2)}</balance>\n`
      xml += `  <credit>${(data.credit || 0).toFixed(2)}</credit>\n`
      xml += `  <bonus>${(data.bonus || 0).toFixed(2)}</bonus>\n`
      xml += `  <spending>${(data.spending || 0).toFixed(2)}</spending>\n`
    }
    
    // Order response
    if (data.status === 'Success') {
      xml += `  <status>Success</status>\n`
      xml += `  <order_no>${data.order_no}</order_no>\n`
      xml += `  <total_amount>${data.total_amount}</total_amount>\n`
      
      if (data.list && data.list.length > 0) {
        xml += '  <list>\n'
        for (const item of data.list) {
          xml += '    <item>\n'
          xml += `      <code>${item.code}</code>\n`
          xml += `      <desc>${item.desc}</desc>\n`
          xml += '    </item>\n'
        }
        xml += '  </list>\n'
      }
    }
    
    // Check status response
    if (data.status_code !== undefined) {
      xml += `  <status_code>${data.status_code}</status_code>\n`
      xml += `  <order_no>${data.order_no}</order_no>\n`
      xml += `  <order_code>${data.order_code || ''}</order_code>\n`
      xml += `  <order_status_description>${data.order_status_description}</order_status_description>\n`
      xml += `  <check_date>${data.check_date}</check_date>\n`
      if (data.extra) {
        xml += `  <extra>${data.extra}</extra>\n`
      }
    }
    
    xml += '</result>'
  }
  
  return xml
}

// Hata response'ları
export const errorResponses = {
  // Kullanıcı bulunamadı
  userNotFound: buildXMLResponse({
    error: true,
    error_code: '1',
    error_message: 'User not found'
  }),
  
  // Geçersiz komut
  invalidCommand: buildXMLResponse({
    error: true,
    error_code: '3',
    error_message: 'Invalid command'
  }),
  
  // Ürün bulunamadı
  productNotFound: buildXMLResponse({
    error: true,
    error_code: '11',
    error_message: 'Product not found'
  }),
  
  // Stok tükenmiş
  outOfStock: buildXMLResponse({
    error: true,
    error_code: '12',
    error_message: 'The product is out of stock'
  }),
  
  // Bakiye yetersiz
  insufficientBalance: buildXMLResponse({
    error: true,
    error_code: '14',
    error_message: 'Insufficient balance'
  }),
  
  // Sistem bakımı
  maintenance: buildXMLResponse({
    error: true,
    error_code: '23',
    error_message: 'System under maintenance'
  }),
  
  // Sipariş bulunamadı
  orderNotFound: buildXMLResponse({
    error: true,
    error_code: '99',
    error_message: 'Order not found'
  })
}

// Başarılı response'lar
export const successResponses = {
  // Balance response
  balance: (balance: number, credit: number = 0, bonus: number = 0, spending: number = 0) => 
    buildXMLResponse({ balance, credit, bonus, spending }),
  
  // Order response
  order: (orderNo: string, totalAmount: number, codes: Array<{code: string, desc: string}>) =>
    buildXMLResponse({
      status: 'Success',
      order_no: orderNo,
      total_amount: totalAmount,
      list: codes
    }),
  
  // Check status response
  checkStatus: (orderNo: string, statusCode: string, statusDescription: string, checkDate: string, extra?: string) =>
    buildXMLResponse({
      status_code: statusCode,
      order_no: orderNo,
      order_code: '',
      order_status_description: statusDescription,
      checkDate,
      extra: extra || ''
    })
}
