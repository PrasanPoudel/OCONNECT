const Contact = require('../models/Contact');
const { DEFAULT_AVATAR } = require('../controllers/contactController');

async function dashboard(req, res, next) {
  try {
    const userId = req.session.userId;

    const [total, favorites, withEmail, recent] = await Promise.all([
      Contact.countDocuments({ user: userId }),
      Contact.countDocuments({ user: userId, favorite: true }),
      Contact.countDocuments({ user: userId, email: { $nin: ['', null] } }),
      Contact.find({ user: userId }).sort({ createdAt: -1 }).limit(5)
    ]);

    const recentContacts = recent.map((c) => ({
      ...c.toObject(),
      imageUrl: c.imageUrl || DEFAULT_AVATAR
    }));

    res.render('dashboard/index', {
      title: 'Dashboard',
      stats: { total, favorites, withEmail },
      recentContacts,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { dashboard };
