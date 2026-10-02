const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const customFieldController = require('../controllers/customFieldController');

router.use(verifyToken);

router.get('/', customFieldController.getCustomFields);
router.post('/', customFieldController.createCustomField);
router.put('/:id', customFieldController.updateCustomField);
router.delete('/:id', customFieldController.deleteCustomField);

module.exports = router;