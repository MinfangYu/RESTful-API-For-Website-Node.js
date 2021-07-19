const db = require('../../config/db');

exports.setImage = async function (id, filename) {
    const conn = await db.getPool().getConnection();
    const query = 'update user set image_filename = ? where id = ?';
    const [result] = await conn.query(query, [filename, id]);
    conn.release();
    return result;
};
exports.deleteUserImage = async function (id) {
    const conn = await db.getPool().getConnection();
    const query = 'update user set image_filename = null where id = ?';
    const [result] = await conn.query(query, [id]);
    conn.release();
    return result;
};
exports.getEventImage = async function (eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'select image_filename from event where id = ?';
    const [result] = await conn.query(query, [eventId]);
    conn.release();
    return result;
};
exports.setEventImage = async function (eventId, filename) {
    const conn = await db.getPool().getConnection();
    const query = 'update event set image_filename = ? where id = ?';
    const [result] = await conn.query(query, [filename, eventId]);
    conn.release();
    return result;
};