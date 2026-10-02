const db = require('../config/db');

// Trả về id của nhóm đó và toàn bộ nhóm con cháu
async function getSubtreeGroupIds(groupId) {
    const [rows] = await db.execute('SELECT id, parent_id FROM `groups`');
    const children = new Map();
    for (const r of rows) {
        if (!children.has(r.parent_id)) children.set(r.parent_id, []);
        children.get(r.parent_id).push(r.id);
    }
    const result = [];
    const stack = [groupId];
    while (stack.length) {
        const id = stack.pop();
        if (result.includes(id)) continue; // chống vòng lặp nếu dữ liệu bị lỗi
        result.push(id);
        stack.push(...(children.get(id) || []));
    }
    return result;
}

module.exports = { getSubtreeGroupIds };