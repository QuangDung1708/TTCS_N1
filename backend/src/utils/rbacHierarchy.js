const db = require('../config/db');

/**
 * Lấy danh sách tất cả các ID nhóm con trực thuộc (đệ quy)
 * @param {number} groupId 
 * @returns {Promise<number[]>} Danh sách groupId được phép xem
 */
async function getAllSubGroupIds(groupId) {
    const [allGroups] = await db.execute('SELECT id, parent_id FROM `groups`');
    
    const resultIds = [parseInt(groupId)];
    
    function collectChildren(currentId) {
        for (const g of allGroups) {
            if (g.parent_id === currentId) {
                resultIds.push(g.id);
                collectChildren(g.id);
            }
        }
    }
    
    collectChildren(parseInt(groupId));
    return resultIds;
}

module.exports = { getAllSubGroupIds };