const Contact = require('../models/Contact');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

const PAGE_SIZE = 10;
const DEFAULT_AVATAR = '/img/default-avatar.svg';

function toBool(value) {
  return value === 'on' || value === 'yes' || value === 'true';
}

function normalizeUrl(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

function buildFilter(userId, query) {
  const filter = { user: userId };

  const search = (query.search || '').trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { fullName: regex },
      { phone: regex },
      { email: regex },
      { company: regex }
    ];
  }

  if (toBool(query.favorite)) {
    filter.favorite = true;
  }

  return filter;
}

function buildSort(query) {
  switch (query.sort) {
    case 'name_asc':
      return { fullName: 1 };
    case 'name_desc':
      return { fullName: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
}

function applyFields(contact, body) {
  contact.fullName = body.fullName;
  contact.phone = body.phone || '';
  contact.email = body.email || '';
  contact.address = body.address || '';
  contact.company = body.company || '';
  contact.jobTitle = body.jobTitle || '';
  contact.website = normalizeUrl(body.website);
  contact.notes = body.notes || '';
  contact.favorite = toBool(body.favorite);
  return contact;
}

async function findOwnedContact(req, res) {
  const contact = await Contact.findOne({ _id: req.params.id, user: req.session.userId });
  if (!contact) {
    res.status(404).render('error/404', { title: 'Not Found', user: req.session.user || null });
    return null;
  }
  return contact;
}

async function listContacts(req, res, next) {
  try {
    const userId = req.session.userId;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const filter = buildFilter(userId, req.query);
    const sort = buildSort(req.query);

    const total = await Contact.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
    const currentPage = Math.min(page, totalPages);

    const contacts = await Contact.find(filter)
      .sort(sort)
      .skip((currentPage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    const enriched = contacts.map((c) => ({
      ...c.toObject(),
      imageUrl: c.imageUrl || DEFAULT_AVATAR
    }));

    res.render('contacts/index', {
      title: 'My Contacts',
      contacts: enriched,
      query: req.query,
      csrfToken: req.csrfToken(),
      pagination: {
        page: currentPage,
        totalPages,
        total,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        prev: currentPage - 1,
        next: currentPage + 1
      }
    });
  } catch (error) {
    next(error);
  }
}

function newContact(req, res) {
  res.render('contacts/form', {
    title: 'Add Contact',
    contact: null,
    isEdit: false,
    defaultAvatar: DEFAULT_AVATAR,
    csrfToken: req.csrfToken()
  });
}

async function createContact(req, res, next) {
  try {
    const contact = applyFields(new Contact({ user: req.session.userId }), req.body);
    if (req.file) {
      const { url, publicId } = await uploadImage(req.file.buffer);
      contact.imageUrl = url;
      contact.imagePublicId = publicId;
    }
    await contact.save();
    req.flash('success', 'Contact created successfully.');
    res.redirect('/contacts');
  } catch (error) {
    next(error);
  }
}

async function showContact(req, res, next) {
  try {
    const contact = await findOwnedContact(req, res);
    if (!contact) return;
    res.render('contacts/show', {
      title: contact.fullName,
      contact: { ...contact.toObject(), imageUrl: contact.imageUrl || DEFAULT_AVATAR },
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    next(error);
  }
}

async function editContact(req, res, next) {
  try {
    const contact = await findOwnedContact(req, res);
    if (!contact) return;
    res.render('contacts/form', {
      title: `Edit ${contact.fullName}`,
      contact: contact.toObject(),
      isEdit: true,
      defaultAvatar: DEFAULT_AVATAR,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    next(error);
  }
}

async function updateContact(req, res, next) {
  try {
    const contact = await findOwnedContact(req, res);
    if (!contact) return;

    applyFields(contact, req.body);

    if (req.file) {
      const { url, publicId } = await uploadImage(req.file.buffer);
      const oldPublicId = contact.imagePublicId;
      contact.imageUrl = url;
      contact.imagePublicId = publicId;
      if (oldPublicId) await deleteImage(oldPublicId);
    }

    await contact.save();
    req.flash('success', 'Contact updated successfully.');
    res.redirect(`/contacts/${contact._id}`);
  } catch (error) {
    next(error);
  }
}

async function toggleFavorite(req, res, next) {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, user: req.session.userId });
    if (!contact) {
      return res.status(404).json({ error: 'Not found' });
    }
    contact.favorite = !contact.favorite;
    await contact.save();
    req.flash('success', contact.favorite ? 'Added to favorites.' : 'Removed from favorites.');
    res.redirect(req.get('referer') || '/contacts');
  } catch (error) {
    next(error);
  }
}

async function deleteContact(req, res, next) {
  try {
    const contact = await findOwnedContact(req, res);
    if (!contact) return;
    if (contact.imagePublicId) await deleteImage(contact.imagePublicId);
    await contact.deleteOne();
    req.flash('success', 'Contact deleted successfully.');
    res.redirect('/contacts');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  DEFAULT_AVATAR,
  listContacts,
  newContact,
  createContact,
  showContact,
  editContact,
  updateContact,
  toggleFavorite,
  deleteContact
};
