import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { reviewRequest, sendRequest } from '../../controllers/request.controller.js';


const requestRouter = express.Router();

requestRouter.use(authMiddleware);

requestRouter.post('/sendRequest/:status/:toUserId', sendRequest );
requestRouter.post('/reviewRequest/:status/:requestId', reviewRequest );


export default requestRouter;