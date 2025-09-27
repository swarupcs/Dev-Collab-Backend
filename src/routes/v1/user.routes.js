import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getSuggestedRequest } from '../../controllers/user.controller.js';


const userRouter = express.Router();

userRouter.use(authMiddleware);

userRouter.get('/getSuggestionRequest', getSuggestedRequest);


export default userRouter;