const db = require('../../config/db');

/**
 * SELECT * from
 (select event.id as eventId, event.title as title, event.capacity as capacity, user.first_name as organizerFirstName, user.last_name as organizerLastName, event.date as date, group_concat(distinct event_category.category_id) as categoriesSet,count(distinct event_attendees.user_id) as numAcceptedAttendees from event join event_category on event.id = event_category.event_id left join user on event.organizer_id = user.id left join event_attendees on event.id = event_attendees.event_id where attendance_status_id = 1
 group by event.id order by event.date DESC) as table1 where find_in_set( 6, categoriesSet)

 */

exports.viewEvent = async function (startIndex, count, q, categoryId, organizerId, sortBy) {
    const conn = await db.getPool().getConnection();
    let query = 'select event.id as eventId, event.title as title, event.capacity as capacity, ' +
        'user.first_name as organizerFirstName, user.last_name as organizerLastName, event.date as date, ' +
        'group_concat(distinct event_category.category_id) as categories,' +
        'count(distinct event_attendees.user_id) as numAcceptedAttendees ' +
        'from event ' +
        'join event_category on event.id = event_category.event_id ' +
        'left join user on event.organizer_id = user.id ' +
        'left join event_attendees on event.id = event_attendees.event_id ' +
        'where attendance_status_id = 1 ';
    const info = [];
    if (q) {
        query += 'and (event.title like ? or event.description like ?) ';
        info.push('%' + q + '%');
        info.push('%' + q + '%');
    }
    let categoryCheck = '';
    if (categoryId) {
        categoryCheck += ' where find_in_set( ?, categories) ';
        info.push(categoryId[0]);
        if (categoryId.length > 1) {
            for (const i of categoryId.slice(1)) {
                categoryCheck += 'or find_in_set( ?, categories)';
                info.push(i);
            }
        }
    }
    if (organizerId) {
        query += 'and event.organizer_id = ? ';
        info.push(organizerId);
    }
    query += 'group by event.id ';
    if (sortBy) {
        query += 'order by ';
        if (sortBy === 'ALPHABETICAL_ASC') {
            query += 'event.title ASC';
        } else if (sortBy === 'ALPHABETICAL_DESC') {
            query += 'event.title DESC';
        } else if (sortBy === 'DATE_ASC') {
            query += 'event.date ASC';
        } else if (sortBy === 'DATE_DESC') {
            query += 'event.date DESC';
        } else if (sortBy === 'ATTENDEES_ASC') {
            query += 'count(event_attendees.user_id) ASC';
        } else if (sortBy === 'ATTENDEES_DESC') {
            query += 'count(event_attendees.user_id) DESC';
        } else if (sortBy === 'CAPACITY_ASC') {
            query += 'event.capacity ASC';
        } else if (sortBy === 'CAPACITY_DESC') {
            query += 'event.capacity DESC';
        }
    } else {
        query += 'order by event.date DESC';
    }
    const [result] = await conn.query(`select * from (${query}) as table1 ${categoryCheck}`, info);
    conn.release();
    for (const row of result) {
        row.categories =  row.categories.split(',').map(value => parseInt(value.trim()));
    }
    if (count) {
        return result.slice(startIndex, parseInt(count)+parseInt(startIndex));
    } else{
        return result.slice(startIndex);
    }
};
exports.checkCategoryId = async function (categoryId) {
    const conn = await db.getPool().getConnection();
    let flag = false;
    const query = 'select id from category';
    const [result] = await conn.query(query);
    if (typeof categoryId != "string") {
        const sortedId = categoryId.sort();
        for (let x = 0; x < sortedId.length - 1; x++) {
            if (sortedId[x] === sortedId[x + 1]) {
                return false;
            }
        }
    }
    for (const i of result) {
        if (typeof categoryId != "string") {
            for (const j of categoryId) {
                if (/^\d+$/.test(j) && i.id == j) {
                    flag = true;
                    break;
                }
            }
        } else {
            if (/^\d+$/.test(categoryId) && i.id === parseInt(categoryId)) {
                flag = true;
                break;
            }
        }
    }
    conn.release();
    return flag;
};
exports.postEvent = async function (title, description, date, imageFilename, isOnline, url, venue, capacity, requiresAttendanceControl, fee, organizerId) {
    const conn = await db.getPool().getConnection();
    let query = 'insert into event (title, description, date, image_filename, is_online, url, venue, capacity, requires_attendance_control, fee, organizer_id) ' +
        'values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const [result] = await conn.query(query, [title, description, date, imageFilename, isOnline, url, venue, capacity, requiresAttendanceControl, fee, organizerId]);
    conn.release();
    return result.insertId;
};
exports.viewOneEvent = async function (eventId) {
    const conn = await db.getPool().getConnection();
    let query = 'select event.id as id, event.title as title, event.description as description, event.organizer_id as organizerId, ' +
        'user.first_name as organizerFirstName, user.last_name as organizerLastName, ' +
        'count(distinct event_attendees.user_id) as attendeeCount, event.capacity as capacity, event.is_online as isOnline, ' +
        'event.url as url, event.venue as venue, event.requires_attendance_control as requiresAttendanceControl, ' +
        'event.fee as fee, group_concat(distinct event_category.category_id) as categories, event.date as date ' +
        'from event ' +
        'left join event_category on event.id = event_category.event_id ' +
        'left join user on event.organizer_id = user.id ' +
        'left join event_attendees on event.id = event_attendees.event_id ' +
        'where attendance_status_id = 1 and event.id = ? ';
    conn.release();
    const [result] = await conn.query(query, eventId);
    for (const row of result) {
        if (row.categories) {
            row.categories =  row.categories.split(',').map(value => parseInt(value.trim()));
        }
    }
    return result;
};
exports.updateOneEvent = async function (eventId, title, description, date, isOnline, url, venue, capacity, requiresAttendanceControl, fee) {
    const conn = await db.getPool().getConnection();
    let query = 'update event set ';
    const info = [];
    if (title) {
        query += 'title = ?, '
        info.push(title);
    }
    if (description) {
        query += 'description = ?, '
        info.push(description);
    }
    if (date) {
        query += 'date = ?, '
        info.push(date);
    }
    if (isOnline) {
        query += 'is_online = ?, '
        info.push(isOnline);
    }
    if (url) {
        query += 'url = ?, '
        info.push(url);
    }
    if (venue) {
        query += 'venue = ?, '
        info.push(venue);
    }
    if (capacity) {
        query += 'capacity = ?, '
        info.push(capacity);
    }
    if (requiresAttendanceControl) {
        query += 'requires_attendance_control = ?, '
        info.push(requiresAttendanceControl);
    }
    if (fee) {
        query += 'fee = ?, '
        info.push(fee);
    }
    query = query.substring(0, query.length - 2);
    query += ' where id = ?';
    info.push(eventId);
    const [result] = await conn.query(query, info);
    conn.release();
    return result;
};
exports.updateCategory = async function (eventId, categoryId) {
    const conn = await db.getPool().getConnection();
    const query = 'insert into event_category (event_id, category_id) values ( ?, ? )';
    for (const i of categoryId) {
        await conn.query(query, [eventId, i]);
    }
    conn.release();
    return 1;
};
exports.deleteOneEvent = async function (eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'delete from event where id = ?';
    const result = await conn.query(query, [eventId]);
    conn.release();
    return result;
};
exports.deleteEventAttendees = async function (eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'delete from event_attendees where event_id = ?';
    const result = await conn.query(query, [eventId]);
    conn.release();
    return result;
};
exports.deleteCategory = async function (eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'delete from event_category where event_id = ?';
    const result = await conn.query(query, [eventId]);
    conn.release();
    return result;
};
exports.getAllCategories = async function () {
    const conn = await db.getPool().getConnection();
    const query = 'select id, name from category';
    const [result, _] = await conn.query(query);
    conn.release();
    return result;
};
exports.getEventAttendees = async function (eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'select event_attendees.user_id as attendeeId, user.first_name as firstName, user.last_name as lastName, ' +
        'event_attendees.date_of_interest as dateOfInterest , attendance_status.name as status from event_attendees ' +
        'left join attendance_status on event_attendees.attendance_status_id = attendance_status.id ' +
        'left join user on event_attendees.user_id = user.id ' +
        'where event_attendees.event_id = ? and event_attendees.attendance_status_id = 1 ' +
        'order by event_attendees.date_of_interest ASC';
    const [result] = await conn.query(query, [eventId]);
    conn.release();
    return result;
};
exports.checkAttendees = async function (userId, eventId) {
    const conn = await db.getPool().getConnection();
    let flag = false;
    const query = 'select user_id from event_attendees where event_id = ? and user_id = ?';
    const [result] = await conn.query(query, [eventId, userId]);
    if (result.length === 0) {
        flag = true;
    }
    conn.release();
    return flag;
};
exports.updateAttendees = async function (userId, eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'insert into event_attendees (event_id, user_id, attendance_status_id, date_of_interest) values ( ?, ?, ?, ?)';
    const result = await conn.query(query, [eventId, userId, 1, new Date()]);
    conn.release();
    return result;
};
exports.removeAttendees = async function (userId, eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'delete from event_attendees where event_id = ? and user_id = ?';
    const result = await conn.query(query, [eventId, userId]);
    conn.release();
    return result;
};
exports.updateAttendeeStatus = async function (statusId, userId, eventId) {
    const conn = await db.getPool().getConnection();
    const query = 'update event_attendees set attendance_status_id = ? where event_id = ? and user_id = ?';
    const result = await conn.query(query, [statusId, eventId, userId]);
    conn.release();
    return result;
};
exports.getAttendeeStatus = async function (statusName) {
    const conn = await db.getPool().getConnection();
    const query = 'select id from attendance_status where name = ?';
    const [result] = await conn.query(query, [statusName]);
    conn.release();
    return result;
};