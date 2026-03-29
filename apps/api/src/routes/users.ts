import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'
import { createHash } from 'crypto'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock users data (in real app this would come from database)
let mockUsers = [
  {
    id: '1',
    email: 'admin@omega.com',
    name: 'Admin User',
    passwordHash: createHash('sha256').update('admin123').digest('hex'),
    role: 'ADMIN',
    isActive: true,
    forcePasswordChange: false,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'accounting@omega.com',
    name: 'Accounting User',
    passwordHash: createHash('sha256').update('acc123').digest('hex'),
    role: 'ACCOUNTING',
    isActive: true,
    forcePasswordChange: false,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// Simple auth middleware
const authMiddleware = (allowedRoles: string[]) => (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Mock user (in real app this would verify JWT)
  const user = mockUsers.find(u => u.id === '1'); // Mock: always return admin
  
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  (req as any).user = user;
  next();
};

// Zod schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/),
  role: z.enum(['ADMIN', 'OPERATIONS', 'ACCOUNTING', 'PRICING']),
  name: z.string().min(1)
});

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'OPERATIONS', 'ACCOUNTING', 'PRICING']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).optional()
});

// Password validation helper
const validatePassword = (password: string) => {
  const errors = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least 1 special character');
  }
  
  return errors;
};

// Generate temporary password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Audit logging helper (mock implementation)
const logAudit = (action: string, entity: string, entityId: string, meta: any, userId: string) => {
  logger.info('Audit log', { action, entity, entityId, meta, userId });
  // In real app, this would write to audit_logs table
};

// GET /users - List all users
router.get('/', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const users = mockUsers.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    }));
    
    res.json(users);
    
  } catch (error) {
    logger.error('Error listing users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users - Create new user
router.post('/', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    
    // Check if email already exists
    const existingUser = mockUsers.find(u => u.email === validatedData.email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const passwordHash = createHash('sha256').update(validatedData.password).digest('hex');
    
    // Create new user
    const newUser = {
      id: (mockUsers.length + 1).toString(),
      email: validatedData.email,
      name: validatedData.name,
      passwordHash,
      role: validatedData.role,
      isActive: true,
      forcePasswordChange: false,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    mockUsers.push(newUser);
    
    // Log audit
    logAudit('USER_CREATED', 'User', newUser.id, {
      email: newUser.email,
      role: newUser.role
    }, (req as any).user.id);
    
    // Return user without password hash
    const { passwordHash: _, ...userResponse } = newUser;
    
    res.status(201).json(userResponse);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/:id - Update user
router.patch('/:id', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);
    
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = mockUsers[userIndex];
    const currentUser = (req as any).user;
    
    // User cannot update their own role
    if (user.id === currentUser.id && validatedData.role && validatedData.role !== user.role) {
      return res.status(403).json({ error: 'Cannot update your own role' });
    }
    
    // Check if this is the last admin and trying to deactivate or change role
    const adminCount = mockUsers.filter(u => u.role === 'ADMIN' && u.isActive).length;
    if (user.role === 'ADMIN' && user.isActive && adminCount === 1) {
      if (validatedData.isActive === false || (validatedData.role && validatedData.role !== 'ADMIN')) {
        return res.status(400).json({ error: 'Cannot deactivate or change role of the last admin user' });
      }
    }
    
    // Update user
    const updatedUser = { ...user, ...validatedData };
    mockUsers[userIndex] = updatedUser;
    
    // Log audit
    logAudit('USER_UPDATED', 'User', updatedUser.id, {
      changes: validatedData
    }, currentUser.id);
    
    // Return user without password hash
    const { passwordHash: _, ...userResponse } = updatedUser;
    
    res.json(userResponse);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /users/:id - Deactivate user (soft delete)
router.delete('/:id', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = mockUsers[userIndex];
    const currentUser = (req as any).user;
    
    // Cannot deactivate yourself
    if (user.id === currentUser.id) {
      return res.status(403).json({ error: 'Cannot deactivate your own account' });
    }
    
    // Check if this is the last admin
    const adminCount = mockUsers.filter(u => u.role === 'ADMIN' && u.isActive).length;
    if (user.role === 'ADMIN' && user.isActive && adminCount === 1) {
      return res.status(400).json({ error: 'Cannot deactivate the last admin user' });
    }
    
    // Deactivate user
    mockUsers[userIndex] = { ...user, isActive: false };
    
    // Log audit
    logAudit('USER_DEACTIVATED', 'User', user.id, {
      email: user.email,
      role: user.role
    }, currentUser.id);
    
    res.json({ message: 'User deactivated successfully' });
    
  } catch (error) {
    logger.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users/:id/reset-password - Reset user password
router.post('/:id/reset-password', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = mockUsers[userIndex];
    
    // Generate temporary password
    const tempPassword = generateTempPassword();
    
    // Hash new password
    const passwordHash = createHash('sha256').update(tempPassword).digest('hex');
    
    // Update user
    mockUsers[userIndex] = { 
      ...user, 
      passwordHash,
      forcePasswordChange: true 
    };
    
    // Log audit
    logAudit('USER_UPDATED', 'User', user.id, {
      action: 'PASSWORD_RESET',
      forcePasswordChange: true
    }, (req as any).user.id);
    
    res.json({
      message: 'Password reset successfully',
      temporaryPassword: tempPassword,
      forcePasswordChange: true
    });
    
  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as usersRouter }
