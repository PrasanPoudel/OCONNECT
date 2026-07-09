function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please log in to access that page.');
  return res.redirect('/auth/login');
}

module.exports = isAuthenticated;
