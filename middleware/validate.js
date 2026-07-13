import { validationResult } from 'express-validator';

/**
 * Higher-order middleware wrapper to execute express-validator check rules sequentially.
 * If validation fails, halts execution and responds with a formatted 400 response.
 * 
 * @param {Array} validations - Array of express-validator checking chains.
 * @returns {Function} Express middleware function.
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // 1. Run each validation chain against the request object
    for (const validation of validations) {
      await validation.run(req);
    }

    // 2. Retrieve validation results
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // 3. Format error items consistently to conform with front-end expectations
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param, // handles express-validator v7 path property and legacy param property
      message: err.msg
    }));

    // 4. Return formatted response (matches client validation error handling)
    return res.status(400).json({
      success: false,
      message: 'Validation failed: ' + formattedErrors.map(e => e.message).join(', '),
      errors: formattedErrors
    });
  };
};
