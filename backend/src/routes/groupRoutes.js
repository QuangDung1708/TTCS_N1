const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const groupController = require('../controllers/groupController');

router.use(verifyToken);

router.get('/tree', groupController.getOrganizationTree);
router.post('/', requireAdmin, groupController.createGroup);
router.put('/:id', requireAdmin, groupController.updateGroup);
router.get('/:id/members', groupController.getGroupMembers);
router.post('/:id/assign-members', requireAdmin, groupController.assignMembers);
router.patch('/:id/leader', requireAdmin, groupController.setGroupLeader);

module.exports = router;