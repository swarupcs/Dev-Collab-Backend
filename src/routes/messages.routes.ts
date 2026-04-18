import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();
const messagesController = new MessagesController();

router.use(authenticate);

router.get('/conversations', messagesController.getConversations);
router.get('/:userId', messagesController.getMessages);
router.post('/:userId/read', messagesController.markAsRead);

export default router;