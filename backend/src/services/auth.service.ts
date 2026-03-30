import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { logger } from '../config/logger'

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: string
    forcePasswordChange: boolean
  }
}

export class AuthService {
  private readonly jwtSecret: string
  private readonly jwtRefreshSecret: string
  private readonly jwtExpiresIn: string
  private readonly jwtRefreshExpiresIn: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production'
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production'
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m'
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  }

  async login(email: string, password: string, ip: string): Promise<LoginResult> {
    try {
      // 1. DB'den kullanıcıyı bul
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user || !user.isActive) {
        await this.logAudit(null, 'LOGIN_FAILED', 'User', null, ip, { email })
        throw new Error('Geçersiz kimlik bilgileri')
      }

      // 2. Şifre kontrolü
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
      if (!isPasswordValid) {
        await this.logAudit(user.id, 'LOGIN_FAILED', 'User', user.id, ip, { email })
        throw new Error('Geçersiz kimlik bilgileri')
      }

      // 3. Token'ları oluştur
      const accessToken = this.generateAccessToken(user.id, user.role)
      const refreshToken = this.generateRefreshToken(user.id)

      // 4. Son giriş güncelle
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      // 5. Audit log yaz
      await this.logAudit(user.id, 'LOGIN_SUCCESS', 'User', user.id, ip, { email })

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          forcePasswordChange: user.forcePasswordChange
        }
      }
    } catch (error) {
      logger.error('Login error:', error)
      throw error
    }
  }

  async refresh(refreshToken: string, ip: string): Promise<{ accessToken: string }> {
    try {
      // 1. Token'ı doğrula
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token')
      }

      // 2. DB'den user'ı kontrol et
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub }
      })

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      // 3. Yeni access token oluştur
      const accessToken = this.generateAccessToken(user.id, user.role)

      // 4. Audit log yaz
      await this.logAudit(user.id, 'TOKEN_REFRESH', 'User', user.id, ip)

      return { accessToken }
    } catch (error) {
      logger.error('Token refresh error:', error)
      throw new Error('Invalid refresh token')
    }
  }

  async logout(userId: string, ip: string): Promise<void> {
    try {
      await this.logAudit(userId, 'LOGOUT', 'User', userId, ip)
    } catch (error) {
      logger.error('Logout error:', error)
    }
  }

  generateAccessToken(userId: string, role: string): string {
    const options: SignOptions = { expiresIn: this.jwtExpiresIn as string }
    const payload = { sub: userId, role, type: 'access' as const }
    return jwt.sign(payload, this.jwtSecret, options)
  }

  generateRefreshToken(userId: string): string {
    const options: SignOptions = { expiresIn: this.jwtRefreshExpiresIn as string }
    const payload = { sub: userId, type: 'refresh' as const }
    return jwt.sign(payload, this.jwtRefreshSecret, options)
  }

  private async logAudit(
    userId: string | null,
    action: string,
    entity: string,
    entityId: string | null,
    ip: string,
    meta: any = {}
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          meta,
          ip
        }
      })
    } catch (error) {
      logger.error('Audit log error:', error)
    }
  }
}
