const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const dealReasonController = require('../controllers/dealReasonController');

router.use(verifyToken);
router.get('/', dealReasonController.getDealReasons);
router.post('/', dealReasonController.createDealReason);
router.put('/:id', dealReasonController.updateDealReason);
router.delete('/:id', dealReasonController.deleteDealReason);

module.exports = router;