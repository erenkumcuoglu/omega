import express from 'express'
import cors from 'cors'
import { URLSearchParams } from 'url'

// Handler imports
import { handleBalance } from './handlers/balance'
import { handleEpinList } from './handlers/epinList'
import { handleEpinProducts } from './handlers/epinProducts'
import { handleEpinOrder } from './handlers/epinOrder'
import { handleCheckStatus } from './handlers/checkStatus'

// State management imports
import { state, resetState, updateScenario, updateBalance } from './data/state'
import { categories } from './data/products'

const app = express()
const PORT = process.env.PORT || 3099

// Middleware
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// Ana Turkpin endpoint - tüm komutlar buraya gelir
app.post('/', async (req, res) => {
  try {
    const startTime = Date.now()
    
    // DATA parametresini parse et
    const data = req.body.DATA
    if (!data) {
      return res.status(400).send('DATA parameter required')
    }

    // XML'i parse et (basit parse)
    const params = parseXMLData(data)
    const cmd = params.cmd
    const username = params.username
    const password = params.password

    if (!cmd) {
      return res.send(errorResponses.invalidCommand)
    }
  }
})

// API.php endpoint'i için de aynı handler
app.post('/api.php', async (req, res) => {
  try {
    const startTime = Date.now()
    
    // DATA parametresini parse et
    const data = req.body.DATA
    if (!data) {
      return res.status(400).send('DATA parameter required')
    }

    // XML'i parse et (basit parse)
    const params = parseXMLData(data)
    const cmd = params.cmd
    const username = params.username
    const password = params.password

    if (!cmd) {
      return res.send(errorResponses.invalidCommand)
    }

    // Log the request
    const logData = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join(' | ')
    console.log(`[Sandbox] ← cmd=${cmd} | ${logData}`)

    let response = ''
    let success = false

    // Command'a göre handler'a yönlendir
    switch (cmd) {
      case 'checkBalance':
        response = await handleBalance(username, password)
        success = !response.includes('<status>Error</status>')
        break

      case 'epinList':
        response = await handleEpinList(username, password)
        success = !response.includes('<status>Error</status>')
        break

      case 'epinProducts':
        const epinId = params.epinId || params.epin_id
        response = await handleEpinProducts(username, password, epinId)
        success = !response.includes('<status>Error</status>')
        break

      case 'epinOrder':
        const productId = params.product_id || params.productId
        const qty = parseInt(params.qty || params.quantity || '1')
        response = await handleEpinOrder(username, password, productId, qty)
        success = !response.includes('<status>Error</status>')
        break

      case 'checkStatus':
        const orderNo = params.order_no || params.orderNo
        response = await handleCheckStatus(username, password, orderNo)
        success = !response.includes('<status>Error</status>')
        break

      default:
        response = errorResponses.invalidCommand
        success = false
        break
    }

    const latency = Date.now() - startTime
    const status = success ? 'Success' : 'Error'
    
    // Log the response
    if (success && cmd === 'epinOrder') {
      const orderMatch = response.match(/<order_no>([^<]+)<\/order_no>/)
      const orderNo = orderMatch ? orderMatch[1] : 'unknown'
      console.log(`[Sandbox] → ${status} | order_no=${orderNo} | latency=${latency}ms`)
    } else {
      console.log(`[Sandbox] → ${status} | latency=${latency}ms`)
    }

    res.set('Content-Type', 'application/xml')
    res.send(response)

  } catch (error) {
    console.error('[Sandbox] Error:', error)
    res.status(500).send('Internal Server Error')
  }
})

// Sandbox kontrol endpoint'leri

// Senaryo değiştirme
app.post('/sandbox/scenario', (req, res) => {
  try {
    const { scenario, productId, latency } = req.body
    
    if (!scenario || !['normal', 'out_of_stock', 'insufficient_balance', 'maintenance', 'slow'].includes(scenario)) {
      return res.status(400).json({ error: 'Invalid scenario' })
    }

    updateScenario(scenario, productId, latency)
    
    console.log(`[Sandbox] Scenario updated: ${scenario}${productId ? ` | productId=${productId}` : ''}${latency ? ` | latency=${latency}ms` : ''}`)
    
    res.json({ 
      success: true, 
      scenario: state.scenario,
      outOfStockProductId: state.outOfStockProductId,
      latency: state.latency
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scenario' })
  }
})

// Stok sıfırlama
app.post('/sandbox/reset', (req, res) => {
  try {
    resetState()
    console.log('[Sandbox] State reset')
    res.json({ success: true, message: 'State reset successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset state' })
  }
})

// Anlık durum görme - HTML arayüz
app.get('/sandbox/state', (req, res) => {
  try {
    const recentOrders = Object.values(state.orders)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(order => ({
        orderNo: order.orderNo,
        productId: order.productId,
        productName: order.productName,
        qty: order.qty,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt.toISOString()
      }))

    const products = categories.flatMap(cat => 
      cat.products.map(product => ({
        sku: product.sku,
        name: product.name,
        stock: product.stock,
        price: product.price
      }))
    )

    const stateData = {
      balance: state.balance,
      scenario: state.scenario,
      latency: state.latency,
      outOfStockProductId: state.outOfStockProductId,
      credit: state.credit,
      bonus: state.bonus,
      spending: state.spending,
      totalOrders: Object.keys(state.orders).length,
      products,
      recentOrders
    }

    // Browser için HTML arayüz, API için JSON
    if (req.get('Accept') === 'application/json' || req.get('User-Agent')?.includes('curl')) {
      res.set('Content-Type', 'application/json')
      res.json(stateData)
    } else {
      // HTML arayüz
      res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Omega Turkpin Sandbox - Control Panel</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; }
        .status { display: flex; gap: 20px; margin: 20px 0; }
        .status-item { flex: 1; text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .status-item h3 { margin: 0; color: #666; }
        .status-item .value { font-size: 24px; font-weight: bold; color: #333; }
        .scenario-normal { background: #d4edda; color: #155724; }
        .scenario-warning { background: #fff3cd; color: #856404; }
        .scenario-error { background: #f8d7da; color: #721c24; }
        .products { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
        .product { background: #f8f9fa; padding: 10px; border-radius: 4px; }
        .product-name { font-weight: bold; }
        .product-stock { color: ${stateData.scenario === 'out_of_stock' ? '#dc3545' : '#28a745'}; }
        .orders { margin-top: 20px; }
        .order { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .controls { margin: 20px 0; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin: 5px; cursor: pointer; }
        .btn:hover { background: #0056b3; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .json-view { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Omega Turkpin Sandbox</h1>
            <p>Control Panel - Real-time State Management</p>
        </div>

        <div class="status">
            <div class="status-item">
                <h3>Balance</h3>
                <div class="value">₺${stateData.balance.toFixed(2)}</div>
            </div>
            <div class="status-item">
                <h3>Scenario</h3>
                <div class="value scenario-${stateData.scenario}">${stateData.scenario}</div>
            </div>
            <div class="status-item">
                <h3>Latency</h3>
                <div class="value">${stateData.latency}ms</div>
            </div>
            <div class="status-item">
                <h3>Total Orders</h3>
                <div class="value">${stateData.totalOrders}</div>
            </div>
        </div>

        <div class="controls">
            <button class="btn" onclick="setScenario('normal')">Normal</button>
            <button class="btn" onclick="setScenario('out_of_stock', 'PUBGMTR60')">Out of Stock</button>
            <button class="btn" onclick="setScenario('insufficient_balance')">Low Balance</button>
            <button class="btn" onclick="setScenario('maintenance')">Maintenance</button>
            <button class="btn" onclick="setScenario('slow', '', 5000)">Slow (5s)</button>
            <button class="btn btn-danger" onclick="resetState()">Reset All</button>
            <button class="btn" onclick="updateBalance()">Update Balance</button>
        </div>

        <div class="card">
            <h2>📦 Products (${stateData.products.length})</h2>
            <div class="products">
                ${stateData.products.map(product => `
                    <div class="product">
                        <div class="product-name">${product.name}</div>
                        <div>SKU: ${product.sku}</div>
                        <div>Price: ₺${product.price.toFixed(2)}</div>
                        <div class="product-stock">Stock: ${product.stock}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card">
            <h2>📋 Recent Orders</h2>
            <div class="orders">
                ${stateData.recentOrders.length > 0 ? stateData.recentOrders.map(order => `
                    <div class="order">
                        <strong>${order.orderNo}</strong> - ${order.productName} (${order.qty}x) - ₺${order.totalAmount.toFixed(2)}
                        <br><small>${new Date(order.createdAt).toLocaleString()}</small>
                    </div>
                `).join('') : '<p>No orders yet</p>'}
            </div>
        </div>

        <div class="card">
            <h2>🔧 JSON State</h2>
            <div class="json-view">${JSON.stringify(stateData, null, 2)}</div>
        </div>
    </div>

    <script>
        function setScenario(scenario, productId = '', latency = 300) {
            fetch('/sandbox/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario, productId, latency })
            })
            .then(() => location.reload())
        }

        function resetState() {
            if (confirm('Reset all state to defaults?')) {
                fetch('/sandbox/reset', { method: 'POST' })
                .then(() => location.reload())
            }
        }

        function updateBalance() {
            const amount = prompt('Enter new balance:', '50000')
            if (amount && !isNaN(amount)) {
                fetch('/sandbox/balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: parseFloat(amount) })
                })
                .then(() => location.reload())
            }
        }

        // Auto-refresh every 5 seconds
        setTimeout(() => location.reload(), 5000);
    </script>
</body>
</html>
      `)
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get state' })
  }
})

// Bakiye değiştirme
app.post('/sandbox/balance', (req, res) => {
  try {
    const { amount } = req.body
    
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    updateBalance(amount)
    console.log(`[Sandbox] Balance updated: ${amount}`)
    
    res.json({ 
      success: true, 
      balance: state.balance 
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update balance' })
  }
})

// Basit XML parser (DATA parametresi için)
function parseXMLData(xmlString: string): Record<string, string> {
  const params: Record<string, string> = {}
  
  // Basit regex ile XML parse et
  const usernameMatch = xmlString.match(/<username>([^<]+)<\/username>/)
  const passwordMatch = xmlString.match(/<password>([^<]+)<\/password>/)
  const cmdMatch = xmlString.match(/<cmd>([^<]+)<\/cmd>/)
  const epinIdMatch = xmlString.match(/<epinId>([^<]+)<\/epinId>/) || xmlString.match(/<epin_id>([^<]+)<\/epin_id>/)
  const productIdMatch = xmlString.match(/<product_id>([^<]+)<\/product_id>/) || xmlString.match(/<productId>([^<]+)<\/productId>/)
  const qtyMatch = xmlString.match(/<qty>([^<]+)<\/qty>/) || xmlString.match(/<quantity>([^<]+)<\/quantity>/)
  const orderNoMatch = xmlString.match(/<order_no>([^<]+)<\/order_no>/) || xmlString.match(/<orderNo>([^<]+)<\/orderNo>/)

  if (usernameMatch) params.username = usernameMatch[1]
  if (passwordMatch) params.password = passwordMatch[1]
  if (cmdMatch) params.cmd = cmdMatch[1]
  if (epinIdMatch) params.epinId = epinIdMatch[1]
  if (productIdMatch) params.product_id = productIdMatch[1]
  if (qtyMatch) params.qty = qtyMatch[1]
  if (orderNoMatch) params.order_no = orderNoMatch[1]

  return params
}

// Error response'ları (import için)
const errorResponses = {
  invalidCommand: '<?xml version="1.0" encoding="UTF-8"?><result><status>Error</status><error_code>3</error_code><error_message>Invalid command</error_message></result>'
}

// Server başlat
app.listen(PORT, () => {
  console.log(`🚀 Omega Turkpin Sandbox running on port ${PORT}`)
  console.log(`📡 Main endpoint: POST http://localhost:${PORT}/`)
  console.log(`🎮 Control panel: http://localhost:${PORT}/sandbox/state`)
  console.log(`📊 Current state: balance=₺${state.balance.toFixed(2)}, scenario=${state.scenario}`)
})
