const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const competitorController = require('../controllers/competitorController');

router.use(verifyToken);
router.get('/', competitorController.getCompetitors);
router.post('/', competitorController.createCompetitor);
router.put('/:id', competitorController.updateCompetitor);
router.delete('/:id', competitorController.deleteCompetitor);

module.exports = router;