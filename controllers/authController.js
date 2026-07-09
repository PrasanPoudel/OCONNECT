const User = require('../models/User');
const { check, validationResult } = require('express-validator');

function startSession(req, user) {
  req.session.userId = user._id;
  req.session.user = { _id: user._id, name: user.name, email: user.email };
}

function getRegister(req, res) {
  res.render('auth/register', { title: 'Register', user: null });
}

async function postRegister(req, res, next) {
  await check('name', 'Name is required.').trim().notEmpty().run(req);
  await check('email', 'A valid email is required.').isEmail().normalizeEmail().run(req);
  await check('password', 'Password must be at least 6 characters.').isLength({ min: 6 }).run(req);
  await check('confirmPassword', 'Passwords do not match.').equals(req.body.password).run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/register', {
      title: 'Register',
      user: null,
      errors: errors.array(),
      values: { name: req.body.name, email: req.body.email }
    });
  }

  try {
    const email = req.body.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).render('auth/register', {
        title: 'Register',
        user: null,
        errors: [{ msg: 'That email is already registered.' }],
        values: { name: req.body.name, email: req.body.email }
      });
    }

    const user = await User.create({ name: req.body.name, email, password: req.body.password });
    startSession(req, user);
    req.flash('success', 'Registration successful. Welcome!');
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
}

function getLogin(req, res) {
  res.render('auth/login', { title: 'Login', user: null });
}

async function postLogin(req, res, next) {
  await check('email', 'Email is required.').isEmail().normalizeEmail().run(req);
  await check('password', 'Password is required.').notEmpty().run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login', {
      title: 'Login',
      user: null,
      errors: errors.array(),
      values: { email: req.body.email }
    });
  }

  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(400).render('auth/login', {
        title: 'Login',
        user: null,
        errors: [{ msg: 'Invalid email or password.' }],
        values: { email: req.body.email }
      });
    }

    startSession(req, user);
    req.flash('success', `Welcome back, ${user.name}!`);
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/auth/login');
  });
}

module.exports = {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  logout
};
