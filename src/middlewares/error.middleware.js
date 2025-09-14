import { ApiError } from "../utils.js/api-error.js";


export const globalErrorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      data: err.data || null,
    });
  }

  console.log('Unexpected Error: ', err);

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    statusCode: 500,
    errors: err.errors || [],
    data: null,
  });
};
