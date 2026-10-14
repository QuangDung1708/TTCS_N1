const express = require('express');
const router = express.Router();
const filterController = require('../controllers/filterController');

// Endpoint nhận các query params: ?industry=...&size=...&owner=...&tax_code=...&phone=...
router.get('/companies/filter', filterController.getFilteredData);

module.exports = router;