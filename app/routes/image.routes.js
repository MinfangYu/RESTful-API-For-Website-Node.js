const images = require('../controllers/image.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/users/:id/image')
        .put(images.putImage)
        .get(images.getImage)
        .delete(images.deleteImage);
    app.route(app.rootUrl + '/events/:id/image')
        .get(images.getEventImage)
        .put(images.putEventImage);
};