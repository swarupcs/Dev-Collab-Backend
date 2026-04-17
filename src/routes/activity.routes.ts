import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();
const activityController = new ActivityController();

router.use(authenticate);

router.get('/', activityController.getActivities);
router.post('/read', activityController.markAsRead);

export default router;
