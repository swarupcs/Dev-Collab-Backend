 
/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { Request, Response, NextFunction } from 'express';
import type { ValidationChain } from 'express-validator';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    const errorMessages = errors.array().map((error) => error.msg);
    
    next(new ValidationError(errorMessages.join(', ')));
  };
};
