import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getSentRequests, reviewRequest, sendRequest } from '../../controllers/request.controller.js';


const requestRouter = express.Router();

requestRouter.use(authMiddleware);

requestRouter.post('/sendRequest/:status/:toUserId', sendRequest );
requestRouter.post('/reviewRequest/:status/:requestId', reviewRequest );
requestRouter.post('/reviewRequest/:status/:requestId', reviewRequest );
requestRouter.get('/getSendRequests', getSentRequests);


export default requestRouter;