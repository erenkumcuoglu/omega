const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Turkpin Configuration
const TURKPIN_CONFIG = {
  username: process.env.TURKPIN_USERNAME || 'test_user',
  password: process.env.TURKPIN_PASSWORD || 'test_pass',
  apiUrl: process.env.TURKPIN_API_URL || 'https://api.turkpin.com'
};

console.log('🔌 Turkpin Integration Server');
console.log(`👤 Username: ${TURKPIN_CONFIG.username}`);
console.log(`🔗 API URL: ${TURKPIN_CONFIG.apiUrl}`);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Turkpin Integration Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Turkpin Authentication
app.post('/api/turkpin/auth', async (req, res) => {
  try {
    console.log('🔐 Turkpin auth attempt...');
    
    // Mock authentication for now
    const authResponse = {
      success: true,
      data: {
        token: 'mock-turkpin-token-' + Date.now(),
        expiresIn: 3600,
        user: {
          id: 'turkpin-user-123',
          username: TURKPIN_CONFIG.username,
          email: 'turkpin@example.com'
        }
      }
    };
    
    console.log('✅ Turkpin auth successful');
    res.json(authResponse);
    
  } catch (error) {
    console.error('❌ Turkpin auth error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// Get EPIN Balance
app.get('/api/turkpin/balance', async (req, res) => {
  try {
    console.log('💰 Getting EPIN balance...');
    
    // Mock balance data
    const balanceData = {
      success: true,
      data: {
        balance: 15420.50,
        currency: 'TRY',
        lastUpdated: new Date().toISOString()
      }
    };
    
    console.log('✅ Balance retrieved:', balanceData.data);
    res.json(balanceData);
    
  } catch (error) {
    console.error('❌ Balance error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
  }
});

// Search EPIN Products
app.get('/api/turkpin/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    console.log('🔍 Searching EPIN products...', { category, search });
    
    // Mock product data
    const products = [
      {
        id: 'epin-001',
        name: 'Steam 50 TL',
        category: 'gaming',
        price: 45.00,
        stock: 150,
        isActive: true,
        description: 'Steam wallet code 50 TL'
      },
      {
        id: 'epin-002',
        name: 'Steam 100 TL',
        category: 'gaming',
        price: 90.00,
        stock: 75,
        isActive: true,
        description: 'Steam wallet code 100 TL'
      },
      {
        id: 'epin-003',
        name: 'PUBG Mobile 200 UC',
        category: 'gaming',
        price: 25.00,
        stock: 200,
        isActive: true,
        description: 'PUBG Mobile UC 200'
      },
      {
        id: 'epin-004',
        name: 'League of Legends 1350 RP',
        category: 'gaming',
        price: 75.00,
        stock: 50,
        isActive: true,
        description: 'LoL RP 1350'
      }
    ];
    
    let filteredProducts = products;
    
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    if (search) {
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    console.log(`✅ Found ${filteredProducts.length} products`);
    res.json({
      success: true,
      data: filteredProducts
    });
    
  } catch (error) {
    console.error('❌ Product search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search products'
    });
  }
});

// Purchase EPIN
app.post('/api/turkpin/purchase', async (req, res) => {
  try {
    const { productId, quantity, customerInfo } = req.body;
    
    console.log('💳 EPIN purchase request:', { productId, quantity });
    
    // Mock purchase response
    const purchaseResponse = {
      success: true,
      data: {
        orderId: 'order-' + Date.now(),
        productId,
        quantity,
        totalAmount: quantity * 45.00, // Mock price
        codes: Array.from({ length: quantity }, (_, i) => ({
          code: 'STEAM-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
          status: 'active',
          createdAt: new Date().toISOString()
        })),
        createdAt: new Date().toISOString()
      }
    };
    
    console.log('✅ EPIN purchase successful:', purchaseResponse.data.orderId);
    res.json(purchaseResponse);
    
  } catch (error) {
    console.error('❌ Purchase error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Purchase failed'
    });
  }
});

// Get Order Status
app.get('/api/turkpin/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('📋 Getting order status:', orderId);
    
    // Mock order status
    const orderStatus = {
      success: true,
      data: {
        orderId,
        status: 'completed',
        createdAt: new Date().toISOString(),
        codes: [
          {
            code: 'STEAM-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
            status: 'active',
            usedAt: null
          }
        ]
      }
    };
    
    console.log('✅ Order status retrieved');
    res.json(orderStatus);
    
  } catch (error) {
    console.error('❌ Order status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get order status'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Turkpin Integration Server running on port ${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/turkpin/auth`);
  console.log(`💰 Balance: http://localhost:${PORT}/api/turkpin/balance`);
  console.log(`🔍 Products: http://localhost:${PORT}/api/turkpin/products`);
  console.log('✅ Turkpin integration ready!');
});

console.log(`
🎯 TURKPIN ENTEGRASYONU:
   ✅ Authentication endpoint
   ✅ Balance check
   ✅ Product search
   ✅ EPIN purchase
   ✅ Order status
   
🚀 Frontend: http://localhost:3001
🔌 Backend: http://localhost:3004
`);
