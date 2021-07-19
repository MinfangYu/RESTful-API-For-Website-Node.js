const image = require('../models/image.model');
const user = require('../models/user.model');
const event = require('../models/event.model');
const mime = require('mime');
const fs = require('mz/fs');

exports.getImage = async function (req, res) {
    const id = req.params.id;
    try {
        const oneUser = await user.getOneUser(id);
        if (oneUser.length === 0) {
            return res.status(404).send(`Not Found the user.`);
        }
        const readInfo = oneUser[0];
        if (readInfo.image_filename === null) {
            return res.status(404).send(`Not Found the image.`);
        } else {
            const imageInfo = await fs.readFile('./storage/images/' + readInfo.image_filename);
            const imageType = mime.getType('./storage/images/' + readInfo.image_filename);
            res.setHeader('Content-Type', imageType);
            return res.status(200).send(imageInfo);
        }
    } catch (err) {
        res.status(500).send(`ERROR retrieve a user's profile image : ${ err }`);
    }
};
exports.putImage = async function (req, res) {
    const id = req.params.id;
    try {
        const oneUser = await user.getOneUser(id);
        const token = req.get('X-Authorization');
        const ContentType= req.get('Content-Type');
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneUser.length === 0) {
            return res.status(404).send(`Not Found the user.`);
        }
        const readInfo = oneUser[0];
        if (readInfo.auth_token === token) {
            if (ContentType !== 'image/png' && ContentType !== 'image/jpeg' && ContentType !== 'image/gif') {
                return res.status(400).send(`Wrong image type.`);
            }
            const fileExtension = mime.getExtension(ContentType);
            const filename = 'user_' + id + '.' +fileExtension;
            await fs.writeFile('./storage/images/' + filename, req.body, "binary");
            await image.setImage(id, filename);
            if (readInfo.image_filename !== null) {
                return res.status(200).send(`Set photo successfully.`);
            } else {
                return res.status(201).send(`Create photo successfully.`);
            }
        } else {

            if (userId !== 0) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR put a user's profile image : ${ err }`);
    }
};
exports.deleteImage = async function (req, res) {
    const id = req.params.id;
    try {
        const oneUser = await user.getOneUser(id);
        const token = req.get('X-Authorization');
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneUser.length === 0) {
            return res.status(404).send(`Not Found the user.`);
        }
        const readInfo = oneUser[0];
        if (readInfo.auth_token === token) {
            if (readInfo.image_filename !== null) {
                await fs.unlink('./storage/images/' + readInfo.image_filename);
                await image.deleteUserImage(id);
                return res.status(200).send(`Delete photo successfully.`);
            } else {
                return res.status(404).send(`Not found the photo.`);
            }
        } else {
            if (userId !== 0) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR delete a user's profile image : ${ err }`);
    }
};
exports.putEventImage = async function (req, res) {
    const eventId = req.params.id;
    try {
        const token = req.get('X-Authorization');
        const ContentType= req.get('Content-Type');
        const [oneEvent] = await event.viewOneEvent(eventId);
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        }
        const [userInfo] = await user.getOneUser(oneEvent.organizerId);
        if (userInfo.auth_token === token) {
            if (ContentType !== 'image/png' && ContentType !== 'image/jpeg' && ContentType !== 'image/gif') {
                return res.status(400).send(`Wrong image type.`);
            }
            const fileExtension = mime.getExtension(ContentType);
            const filename = 'event_' + eventId + '.' +fileExtension;
            await fs.writeFile('./storage/images/' + filename, req.body, "binary");
            const [result] = await image.getEventImage(eventId);
            const imageName = result.image_filename;
            await image.setEventImage(eventId, filename);
            if (imageName !== null) {
                return res.status(200).send(`Set photo successfully.`);
            } else {
                return res.status(201).send(`Create photo successfully.`);
            }
        } else {
            if (userId !== 0) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR set a event's hero image : ${ err }`);
    }
};
exports.getEventImage = async function (req, res) {
    const eventId = req.params.id;
    try {
        const [oneEvent] = await event.viewOneEvent(eventId);
        if (oneEvent.id === null) {
            return res.status(404).send(`Not Found the event.`);
        }
        const [result] = await image.getEventImage(eventId);
        const imageName = result.image_filename;
        if (!imageName) {
            return res.status(404).send(`Not Found the image.`);
        } else {
            const imageInfo = await fs.readFile('./storage/images/' + imageName);
            const imageType = mime.getType('./storage/images/' + imageName);
            res.setHeader('Content-Type', imageType);
            return res.status(200).send(imageInfo);
        }
    } catch (err) {
        res.status(500).send(`ERROR get a event's hero image : ${ err }`);
    }
};