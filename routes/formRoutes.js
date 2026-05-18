const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');

router.post('/contact', formController.handleContactSubmit);
router.post('/hire', formController.handleHireSubmit);
router.post('/chatbot', formController.handleChatbotSubmit);

module.exports = router;
