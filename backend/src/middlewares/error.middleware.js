import ApiError from "../utils/ApiError.js";

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  void req;
  void next;
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Server error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export { notFoundHandler, errorHandler };
