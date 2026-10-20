import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', validateBody(refreshSchema), AuthController.refresh);

// Protected routes
router.get('/me', authenticate, AuthController.getMe);

export default router;
