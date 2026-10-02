const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { getGroupTree, createGroup, updateGroup, assignMember } = require('../controllers/groupController');

router.use(verifyToken, requireAdmin);

router.get('/', getGroupTree);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.put('/:id/members', assignMember);

module.exports = router;