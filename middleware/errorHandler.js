function errorHandler(err, req, res, next) {
  console.error(err);

  let statusCode = err.status || 500;
  let message = err.message || 'Something went wrong on the server.';

  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'The requested resource was not found.';
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Uploaded image exceeds the 5MB size limit.';
  }
  if (err.message === 'Only image files are allowed.') {
    statusCode = 400;
  }

  if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'Invalid or missing CSRF token. Please try again.';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(' ');
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = 'That email is already registered.';
  }

  res.status(statusCode);

  if (req.accepts('json') && !req.accepts('html')) {
    return res.json({ error: message });
  }

  return res.render('error/error', {
    title: `Error ${statusCode}`,
    statusCode,
    message,
    user: req.session.user || null
  });
}

function notFound(req, res, next) {
  res.status(404).render('error/404', {
    title: '404 - Page Not Found',
    user: req.session.user || null
  });
}

module.exports = { errorHandler, notFound };
