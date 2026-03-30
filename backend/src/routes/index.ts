import { Router } from 'express'
import authRoutes from './auth.routes'
import systemRoutes from './system.routes'
import productsRoutes from './products.routes'
import providersRoutes from './providers.routes'

const router = Router()

// Public routes
router.use('/auth', authRoutes)

// Protected routes
router.use('/system', systemRoutes)
router.use('/products', productsRoutes)
router.use('/providers', providersRoutes)

export default router
