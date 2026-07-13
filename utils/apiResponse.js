/**
 * Sends a successful JSON response with a consistent structure.
 * 
 * @param {Object} res - Express response object.
 * @param {*} data - The payload to be returned to the client.
 * @param {String} message - A short success message.
 * @param {Number} [statusCode=200] - HTTP status code (defaults to 200).
 */
export const successResponse = (res, data, message, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Sends an error JSON response with a consistent structure.
 * 
 * @param {Object} res - Express response object.
 * @param {String} message - A short message describing the error.
 * @param {Number} [statusCode=500] - HTTP status code (defaults to 500).
 * @param {*} [errors=null] - Additional validation or structured errors details.
 */
export const errorResponse = (res, message, statusCode = 500, errors = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

/**
 * Sends a paginated JSON response with a consistent structure.
 * 
 * @param {Object} res - Express response object.
 * @param {Array} data - The array of data retrieved for the current page.
 * @param {Number} total - The total count of documents in the collection matching queries.
 * @param {Number} page - The current page index (1-based).
 * @param {Number} limit - The number of records retrieved per page.
 */
export const paginatedResponse = (res, data, total, page, limit) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const pages = Math.ceil(total / limitNum) || 0;

  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages,
      hasNext: pageNum < pages,
      hasPrev: pageNum > 1
    }
  });
};
