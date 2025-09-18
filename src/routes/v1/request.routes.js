import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getPendingRequests, getSentRequests, reviewRequest, sendRequest } from '../../controllers/request.controller.js';


const requestRouter = express.Router();

requestRouter.use(authMiddleware);

requestRouter.post('/sendRequest/:status/:toUserId', sendRequest );
requestRouter.post('/reviewRequest/:status/:requestId', reviewRequest );
requestRouter.post('/reviewRequest/:status/:requestId', reviewRequest );
// ?page=1&limit=2
requestRouter.get('/getSendRequests', getSentRequests);
requestRouter.get('/getPendingRequests', getPendingRequests);
// requestRouter.get('/getConnectionsRequests', getSentRequests);




export default requestRouter;