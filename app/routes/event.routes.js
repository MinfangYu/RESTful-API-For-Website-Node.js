const events = require('../controllers/event.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/events/categories')
        .get(events.getCategories);
    app.route(app.rootUrl + '/events')
        .get(events.getEvent)
        .post(events.postEvent);
    app.route(app.rootUrl + '/events/:id')
        .get(events.getOneEvent)
        .patch(events.updateEvent)
        .delete(events.deleteEvent);
    app.route(app.rootUrl + '/events/:id/attendees')
        .get(events.getAttendees)
        .post(events.joinEvent)
        .delete(events.deleteAttendees);
    app.route(app.rootUrl + '/events/:event_id/attendees/:user_id')
        .patch(events.updateStatus);
};
