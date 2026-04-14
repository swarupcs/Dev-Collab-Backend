import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  registerValidation,
  loginValidation,
  changePasswordValidation,
} from '../utils/auth.validation';

const router: Router = Router();
const authController = new AuthController();

// Public routes
router.post(
  '/register',
  validate(registerValidation),
  authController.register
);

router.post(
  '/login',
  validate(loginValidation),
  authController.login
);

router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', authenticate, authController.logout);

router.post('/logout-all', authenticate, authController.logoutAll);

router.get('/me', authenticate, authController.getCurrentUser);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordValidation),
  authController.changePassword
);

export default router;
