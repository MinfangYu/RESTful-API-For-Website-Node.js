const user = require('../models/user.model');
const validator = require('validator');

exports.register = async function (req, res) {
    const userinfo = req.body;
    try {
        if (!userinfo.firstName || !userinfo.lastName || !userinfo.email || !userinfo.password) {
            return res.status(400).send(`Data require complete field.`);
        }
        if (userinfo.password.length === 0 || userinfo.lastName.length === 0 || userinfo.email.length === 0 ||
            userinfo.firstName.length === 0) {
            return res.status(400).send(`Data cannot be empty.`);
        }
        if (!(validator.isEmail(userinfo.email))) {
            return res.status(400).send(`Email is not valid.`);
        }
        const isEmailUsed = await user.isEmailUsed(userinfo.email);
        if (isEmailUsed) {
            return res.status(400).send(`Email has been used.`);
        } else {
            const result = await user.registerUser(userinfo.firstName, userinfo.lastName, userinfo.email, userinfo.password);
            return res.status(201).send({userId : result.insertId});
        }
    } catch (err) {
        res.status(500).send(`ERROR creating user ${userinfo.firstName} ${userinfo.lastName}: ${ err }`);
    }
};
exports.login = async function (req, res) {
    const userinfo = req.body;
    try {
        const isEmailUsed = await user.isEmailUsed(userinfo.email);
        if (!(isEmailUsed)) {
            return res.status(400).send(`Email is not exist.`);
        } else {
            const result = await user.loginUser(userinfo.email, userinfo.password);
            if (result === 0) {
                return res.status(400).send(`Password wrong.`);
            } else {
                return res.status(200).send({userId : result[1], token : result[0]});
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR login user ${userinfo.email}: ${ err }`);
    }
};
exports.logout = async function (req, res) {
    try {
        const token = req.get('X-Authorization');
        const userId = await user.getId(token);
        await user.logoutUser(token);
        if (userId !== 0) {
            return res.status(200).send(`Logout Successfully.`);
        } else {
            return res.status(401).send(`Unauthorized.`);
        }
    } catch (err) {
        res.status(500).send(`ERROR logout user : ${ err }`);
    }
};
exports.getOne = async function (req, res) {
    const id = req.params.id;
    try {
        const token = req.get('X-Authorization');
        const oneUser = await user.getOneUser(id);
        if (oneUser.length === 0 || !oneUser) {
            return res.status(404).send(`Not Found the user.`);
        }
        const readInfo = oneUser[0];
        if (readInfo.auth_token === token) {
            return res.status(200).send({firstName: readInfo.first_name, lastName: readInfo.last_name, email: readInfo.email});
        } else {
            return res.status(200).send({firstName: readInfo.first_name, lastName: readInfo.last_name});
        }
    } catch (err) {
        res.status(500).send(`ERROR get user : ${ err }`);
    }
};
exports.update = async function (req, res) {
    const id = req.params.id;
    const userinfo = req.body;
    try {
        const token = req.get('X-Authorization');
        const oneUser = await user.getOneUser(id);
        const userId = await user.getId(token);
        if (userId === 0) {
            return res.status(401).send(`Unauthorized.`);
        }
        if (oneUser.length === 0) {
            return res.status(404).send(`Not Found the user.`);
        }
        const readInfo = oneUser[0];
        if (readInfo.auth_token === token) {
            if (userinfo.email) {
                if (!(validator.isEmail(userinfo.email))) {
                    return res.status(400).send(`Email is not valid.`);
                }
                const isEmailUsed = await user.isEmailUsed(userinfo.email);
                if (isEmailUsed && readInfo.email !== userinfo.email) {
                    return res.status(400).send(`Email has been used.`);
                }
            }
            if (userinfo.password !== undefined && userinfo.currentPassword === undefined) {
                return res.status(400).send(`Cannot change password without providing current password.`);
            }
            if (userinfo.password !== undefined && userinfo.password.length === 0) {
                return res.status(400).send(`Password cannot be empty.`);
            }
            const result = await user.updateUser(id, userinfo.first_name, userinfo.last_name, userinfo.email,
                userinfo.password, userinfo.currentPassword);
            if (result === 0) {
                return res.status(400).send(`Password wrong.`);
            } else {
                return res.status(200).send(`Update Successfully.`);
            }
        } else {
            if (userId !== 0) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR update user : ${ err }`);
    }
};