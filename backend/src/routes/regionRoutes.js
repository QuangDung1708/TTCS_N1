const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { getRegions, createRegion, updateRegion, deleteRegion } = require('../controllers/regionController');

router.use(verifyToken, requireAdmin);

router.get('/', getRegions);
router.post('/', createRegion);
router.put('/:id', updateRegion);
router.delete('/:id', deleteRegion);

module.exports = router;