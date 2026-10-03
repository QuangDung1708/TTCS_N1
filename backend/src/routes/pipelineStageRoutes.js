
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const pipelineController = require('../controllers/pipelineStageController');

router.use(verifyToken);

router.get('/', pipelineController.getPipelineStages);
router.post('/', pipelineController.createPipelineStage);
router.put('/:id', pipelineController.updatePipelineStage);
router.post('/swap-order', pipelineController.swapPipelineStageOrder);
router.post('/validate-transition', pipelineController.validateStageTransition);

module.exports = router;