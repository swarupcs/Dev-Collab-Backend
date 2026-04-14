import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export const errorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }

  // MongoDB duplicate key error
  if ((error as any).code === 11000) {
    statusCode = 409;
    const field = Object.keys((error as any).keyPattern)[0];
    message = `${field} already exists`;
    isOperational = true;
  }

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    isOperational = true;
  }

  // MongoDB cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    isOperational = true;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  const response: any = {
    success: false,
    message,
  };

  // Include stack trace in development
  if (env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.error = error;
  }

  // Log error
  if (!isOperational) {
    console.error('❌ Unhandled Error:', error);
  }

  res.status(statusCode).json(response);
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
