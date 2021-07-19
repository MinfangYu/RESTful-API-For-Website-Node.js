const event = require('../models/event.model');
const user = require('../models/user.model');
exports.getEvent = async function (req, res) {
    try {
        let startIndex = req.query.startIndex;
        const count = req.query.count;
        const q = req.query.q;
        const categoryId = req.query.categoryIds;
        const organizerId = req.query.organizerId;
        const sortBy = req.query.sortBy;
        if (!startIndex) {
            startIndex = 0;
        }
        if (!/^\d+$/.test(startIndex)) {
            return res.status(400).send(`StartIndex is not an integer.`);
        }
        if (count && !/^\d+$/.test(count)) {
            return res.status(400).send(`Count is not an integer.`);
        }
        if (organizerId && !/^\d+$/.test(organizerId)) {
            return res.status(400).send(`Organizer Id is not an integer.`);
        }
        if (categoryId) {
            const categoryIdFlag = await event.checkCategoryId(categoryId);
            if (!categoryIdFlag) {
                return res.status(400).send(`CategoryId is invalid.`);
            }
        }
        if (sortBy && sortBy !== 'ALPHABETICAL_ASC' && sortBy !== 'ALPHABETICAL_DESC' && sortBy !== 'DATE_ASC' &&
            sortBy !== 'DATE_DESC' && sortBy !== 'ATTENDEES_ASC' && sortBy !== 'ATTENDEES_DESC' &&
            sortBy !== 'CAPACITY_ASC' && sortBy !== 'CAPACITY_DESC') {
                return res.status(400).send(`Sortby is invalid.`);
        } else {
            const result = await event.viewEvent(startIndex, count, q, categoryId, organizerId, sortBy);
            return res.status(200).send(result);
        }
    } catch (err) {
        res.status(500).send(`ERROR viewing events : ${err}`);
    }
}
exports.postEvent = async function (req, res) {
    try {
        const title = req.body.title;
        const description = req.body.description;
        let date = req.body.date;
        let isOnline = req.body.isOnline;
        let url = req.body.url;
        let venue = req.body.venue;
        let capacity = req.body.capacity;
        let requiresAttendanceControl = req.body.requiresAttendanceControl;
        let fee = req.body.fee;
        let imageFilename = req.body.imageFilename;
        const categoryId = req.body.categoryIds;
        const now = new Date();
        const token = req.get('X-Authorization');
        if (!isOnline) {
            isOnline = 0;
        }
        if (!url) {
            url = null;
        }
        if (!venue) {
            venue = null;
        }
        if (!capacity) {
            capacity = null;
        }
        if (!requiresAttendanceControl) {
            requiresAttendanceControl = 0;
        }
        if (requiresAttendanceControl === true) {
            requiresAttendanceControl = 1;
        }
        if (requiresAttendanceControl === false) {
            requiresAttendanceControl = 0;
        }
        if (!fee) {
            fee = 0.00;
        }
        if (!imageFilename) {
            imageFilename = null;
        }

        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        } else {
            if (!title || !description || !categoryId) {
                return res.status(400).send(`Data must include title, description and categoryId`);
            }
            if (categoryId) {
                const categoryIdFlag = await event.checkCategoryId(categoryId);
                if (!categoryIdFlag) {
                    return res.status(400).send(`CategoryId is invalid.`);
                }
            }
            if (date) {
                date = date.replace(/-/g, '/');
                date = new Date(date);
                if (date < now){
                    return res.status(400).send(`The date has passed.`);
                }
            }
            const organizerId = userId;
            const result = await event.postEvent(title, description, date, imageFilename, isOnline, url, venue, capacity, requiresAttendanceControl, fee, organizerId);
            await event.updateCategory(result, categoryId);
            await event.updateAttendees(userId, result);
            return res.status(201).send({"eventId": result});
        }
    } catch (err) {
        res.status(500).send(`ERROR viewing events : ${err}`);
    }
}
exports.getOneEvent = async function (req, res) {
    try {
        const eventId = req.params.id;
        const [result] = await event.viewOneEvent(eventId);
        if (result.id === null) {
            return res.status(404).send(`Not found the event.`);
        } else {
            return res.status(200).send(result);
        }
    } catch (err) {
        res.status(500).send(`ERROR viewing events : ${err}`);
    }
};
exports.updateEvent = async function (req, res) {
    try {
        const eventId = req.params.id;
        const title = req.body.title;
        const description = req.body.description;
        let date = req.body.date;
        const isOnline = req.body.isOnline;
        const url = req.body.url;
        const venue = req.body.venue;
        const capacity = req.body.capacity;
        const requiresAttendanceControl = req.body.requiresAttendanceControl;
        const fee = req.body.fee;
        const token = req.get('X-Authorization');
        const [oneEvent] = await event.viewOneEvent(eventId);
        const categoryId = req.body.categoryIds;
        const now = new Date();
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        }
        const [userInfo] = await user.getOneUser(oneEvent.organizerId);
        if (userInfo.auth_token === token) {
            if (Object.keys(req.body).length === 0) {
                return res.status(400).send(`No change request.`);
            }
            if (date) {
                date = date.replace(/-/g, '/');
                date = new Date(date);
                if (date < now){
                    return res.status(400).send(`The date has passed.`);
                }
            }
            if (categoryId) {
                const categoryIdFlag = await event.checkCategoryId(categoryId);
                if (!categoryIdFlag) {
                    return res.status(400).send(`CategoryId is invalid.`);
                } else {
                    await event.updateOneEvent(eventId, title, description, date, isOnline, url, venue, capacity, requiresAttendanceControl, fee);
                    await event.deleteCategory(eventId);
                    await event.updateCategory(eventId, categoryId);
                    return res.status(200).send(`Update successfully with category id.`);
                }
            } else {
                await event.updateOneEvent(eventId, title, description, date, isOnline, url, venue, capacity, requiresAttendanceControl, fee);
                return res.status(200).send(`Update successfully.`);
            }
        } else {
            if (userId !== 0) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR updating events : ${err}`);
    }
};
exports.deleteEvent = async function (req, res) {
    try {
        const eventId = req.params.id;
        const token = req.get('X-Authorization');
        const [oneEvent] = await event.viewOneEvent(eventId);
        const [userInfo] = await user.getOneUser(oneEvent.organizerId);
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        }
        if (userInfo.auth_token === token) {
            await event.deleteEventAttendees(eventId);
            await event.deleteCategory(eventId);
            await event.deleteOneEvent(eventId);
            return res.status(200).send(`delete successfully.`);
        } else {
            if (userId !== userInfo.organizerId) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR deleting events : ${err}`);
    }
};
exports.getCategories = async function (req, res) {
    try {
        const result = await event.getAllCategories();
        return res.status(200).send(result);
    } catch (err) {
        res.status(500).send(`ERROR getting all categories : ${err}`);
    }
};
exports.getAttendees = async function (req, res) {
    try {
        const eventId = req.params.id;
        const [oneEvent] = await event.viewOneEvent(eventId);
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        } else {
            const result = await event.getEventAttendees(eventId);
            return res.status(200).send(result);
        }
    } catch (err) {
        res.status(500).send(`ERROR getting attendees : ${err}`);
    }
};
exports.joinEvent = async function (req, res) {
    try {
        const eventId = req.params.id;
        const token = req.get('X-Authorization');
        const [oneEvent] = await event.viewOneEvent(eventId);
        const now = new Date();
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        }
        const attendeesFlag = await event.checkAttendees(userId, eventId);
        if (!attendeesFlag) {
            return res.status(403).send(`Cannot sign up for an event twice.`);
        }
        if (oneEvent.date < now) {
            return res.status(403).send(`The date has passed.`);
        }
        else {
            await event.updateAttendees(userId, eventId);
            return res.status(201).send(`Joining successfully.`);
        }
    } catch (err) {
        res.status(500).send(`ERROR requesting attendance to an event : ${err}`);
    }
};
exports.deleteAttendees = async function (req, res) {
    try {
        const eventId = req.params.id;
        const token = req.get('X-Authorization');
        const [oneEvent] = await event.viewOneEvent(eventId);
        const now = new Date();
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        }
        const attendeesFlag = await event.checkAttendees(userId, eventId);
        if (attendeesFlag) {
            return res.status(403).send(`Cannot delete event that don't join.`);
        }
        if (oneEvent.date < now) {
            return res.status(403).send(`The date has passed.`);
        }
        else {
            await event.removeAttendees(userId, eventId);
            return res.status(200).send(`Delete successfully.`);
        }
    } catch (err) {
        res.status(500).send(`ERROR deleting attendance from an event : ${err}`);
    }
};
exports.updateStatus = async function (req, res) {
    try {
        const eventId = req.params.event_id;
        const userId = req.params.user_id;
        const statusName = req.body.status;
        const token = req.get('X-Authorization');
        const [oneEvent] = await event.viewOneEvent(eventId);
        const organizerId = await user.getId(token);
        if (organizerId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        }
        const [userInfo] = await user.getOneUser(oneEvent.organizerId);
        if (userInfo.auth_token === token) {
            const attendeesFlag = await event.checkAttendees(userId, eventId);
            if (attendeesFlag) {
                return res.status(404).send(`Not Found the user.`);
            } else {
                if (statusName != 'accepted' && statusName != 'pending' && statusName != 'rejected') {
                    return res.status(400).send(`Status Wrong.`);
                }
                const [statusId, _] = await event.getAttendeeStatus(statusName);
                await event.updateAttendeeStatus(statusId.id, userId, eventId);
                return res.status(200).send(`Update successfully.`);
            }
        } else {
            if (organizerId !== 0) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR changing the status of an attendee of an event : ${err}`);
    }
};