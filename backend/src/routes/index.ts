import { Router } from 'express'
import systemRoutes from './system.routes'
import productsRoutes from './products.routes'
import providersRoutes from './providers.routes'

const router = Router()

router.use('/system', systemRoutes)
router.use('/products', productsRoutes)
router.use('/providers', providersRoutes)

export default router
