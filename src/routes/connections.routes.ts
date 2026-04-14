import { Router } from 'express';
import { ConnectionsController } from '../controllers/connections.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();
const connectionsController = new ConnectionsController();

// All routes require authentication
router.use(authenticate);

router.post('/send/:userId', connectionsController.sendRequest);
router.post('/accept/:connectionId', connectionsController.acceptRequest);
router.post('/reject/:connectionId', connectionsController.rejectRequest);
router.get('/requests', connectionsController.getPendingRequests);
router.get('/list', connectionsController.getConnections);
router.delete('/:connectionId', connectionsController.removeConnection);

export default router;
