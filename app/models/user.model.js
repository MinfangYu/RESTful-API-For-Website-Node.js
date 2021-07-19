const db = require('../../config/db');
const fs = require('mz/fs');
const bcrypt = require('bcrypt');
const randtoken = require('rand-token');

exports.hash = async function (password) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
};
exports.compare = async function (password,hash) {
    const match = await bcrypt.compare(password, hash);
    return match;
};
exports.registerUser = async function (first_name, last_name, email, password) {
    const hash = await this.hash(password);
    const conn = await db.getPool().getConnection();
    const query = 'insert into user (first_name, last_name, email, password) values ( ? )';
    const userinfo = [first_name, last_name, email, hash];
    const [ result ] = await conn.query( query, [ userinfo ]);
    conn.release();
    return result;
};
exports.getAllEmail = async function () {
    const conn = await db.getPool().getConnection();
    const query = 'select email from user';
    const [ result ] = await conn.query(query);
    conn.release();
    return result;
};
exports.isEmailUsed = async function (email) {
    const emails = await this.getAllEmail();
    let flag = false;
    for(const i in emails){
        if(emails[i].email === email) {
            flag = true;
            break;
        }
    }
    return flag;
};
exports.generateToken = async function () {
    const token = randtoken.generate(32);
    return token;
};
exports.loginUser = async function (email, password) {
    const conn = await db.getPool().getConnection();
    const query = 'select * from user where email = ?';
    const [ [result] ] = await conn.query(query, [email]);
    const match = await this.compare(password, result.password);
    if(match === true ) {
        const token = await this.generateToken();
        const updateToken = 'update user set auth_token = ? where email = ?';
        await conn.query(updateToken, [token, email]);
        conn.release();
        return [token, result.id];
    } else{
        conn.release();
        return 0;
    }
};
exports.logoutUser = async function (token) {
    const conn = await db.getPool().getConnection();
    const deleteToken = 'update user set auth_token = null where auth_token = ?';
    const [ result ] = await conn.query(deleteToken, [token]);
    conn.release();
    return result;
};
exports.getOneUser = async function (id) {
    const conn = await db.getPool().getConnection();
    const query = 'select * from user where id = ?';
    const [ result ] = await conn.query(query, [id]);
    conn.release();
    return result;
};
exports.getId = async function (token) {
    const conn = await db.getPool().getConnection();
    if (token === null)
        return null;
    const queryId = 'select * from user where auth_token = ?';
    const [ [result] ]= await conn.query(queryId, [token]);
    conn.release();
    if (result) {
        return result.id;
    } else {
        return 0;
    }
};
exports.updateUser = async function (id, first_name, last_name, email, password, currentPassword) {
    const conn = await db.getPool().getConnection();
    const getInfo = await this.getOneUser(id);
    if (first_name) {
        getInfo[0].first_name = first_name;
    }
    if (last_name) {
        getInfo[0].last_name = last_name;
    }
    if (email) {
        getInfo[0].email = email;
    }
    if (currentPassword) {
        const match = await this.compare(currentPassword, getInfo[0].password);
        if(match === true ) {
            if (password) {
                const hash = await this.hash(password);
                const query = 'update user set email = ?, first_name = ?, last_name = ?, password = ? where id = ?';
                await conn.query(query, [getInfo[0].email, getInfo[0].first_name, getInfo[0].last_name, hash, id]);
            } else {
                const query = 'update user set email = ?, first_name = ?, last_name = ? where id = ?';
                await conn.query(query, [getInfo[0].email, getInfo[0].first_name, getInfo[0].last_name, id]);
            }
            conn.release();
            return 1;
        } else{
            return 0;
        }
    } else {
        const query = 'update user set email = ?, first_name = ?, last_name = ? where id = ?';
        await conn.query(query, [getInfo[0].email, getInfo[0].first_name, getInfo[0].last_name, id]);
        conn.release();
        return 1;
    }
};
