import express from 'express';
import authRouter from './auth.routes.js';
import requestRouter from './request.routes.js';
import profileRouter from './profile.routes.js';


const v1Router = express.Router();

v1Router.use("/auth", authRouter)
v1Router.use("/requests", requestRouter);
v1Router.use("/profile", profileRouter);

export default v1Router;