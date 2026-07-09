const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const isAuthenticated = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const contactValidators = [
  body('fullName', 'Full name is required.').trim().notEmpty(),
  body('email', 'Enter a valid email.').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('website', 'Enter a valid URL.').optional({ checkFalsy: true }).isURL()
];

function handleValidation(req, res, isEdit) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).render('contacts/form', {
    title: isEdit ? 'Edit Contact' : 'Add Contact',
    contact: isEdit ? { ...req.body, _id: req.params.id } : req.body,
    isEdit,
    defaultAvatar: contactController.DEFAULT_AVATAR,
    errors: errors.array(),
    csrfToken: req.csrfToken()
  });
  return true;
}

router.use(isAuthenticated);

router.get('/', contactController.listContacts);
router.get('/new', contactController.newContact);

router.post(
  '/',
  contactValidators,
  (req, res, next) => {
    if (!handleValidation(req, res, false)) next();
  },
  contactController.createContact
);

router.get('/:id', contactController.showContact);
router.get('/:id/edit', contactController.editContact);
router.post('/:id/favorite', contactController.toggleFavorite);

router.put(
  '/:id',
  contactValidators,
  (req, res, next) => {
    if (!handleValidation(req, res, true)) next();
  },
  contactController.updateContact
);

router.delete('/:id', contactController.deleteContact);

module.exports = router;
