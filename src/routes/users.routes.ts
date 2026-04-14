import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();
const usersController = new UsersController();

// Protected routes
router.get('/me', authenticate, usersController.getMyProfile);
router.patch('/me', authenticate, usersController.updateMyProfile);
router.get('/search', authenticate, usersController.searchUsers);
router.get('/trending-skills', authenticate, usersController.getTrendingSkills);
router.get('/:userId', authenticate, usersController.getUserById);

export default router;
