const { Telegraf, Markup, Input } = require('telegraf')
const sequelize = require('../database/database');
// const Admin = require('../database/AdminModel'); // Модель списка админов
const Profile = require('../database/ProfileModel'); // Модель списка админов

class helperFunction {
    static async doesUserNickname(id) {
        const user = await Profile.findOne({ where: { id_tg: id } });
        if (user) {
            return user.nickname;
        } else { return user }

    }

    static async checkQR(ctx, room) {
        // const user = await Profile.findOne({ where: { id_tg: id } });
        if (room == 'room1')
            return true
        else return false
    }
}

module.exports = helperFunction;