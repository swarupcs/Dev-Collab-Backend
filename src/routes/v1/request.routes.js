import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { sendRequest } from '../../controllers/request.controller.js';


const requestRouter = express.Router();

requestRouter.use(authMiddleware);

requestRouter.post('/sendRequest/:status/:toUserId', sendRequest );


export default requestRouter;