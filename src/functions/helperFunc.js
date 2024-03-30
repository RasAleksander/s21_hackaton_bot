const { Telegraf, Markup, Input } = require('telegraf')
const moment = require('moment');
const sequelize = require('../database/database');
// const Admin = require('../database/AdminModel'); // Модель списка админов
const Profile = require('../database/ProfilePeer'); // Модель списка админов
const MeetingRoom = require('../database/MeetingRoom'); // Модель списка админов

class helperFunction {
    static async doesUserNickname(id) {
        const user = await Profile.findOne({ where: { id_tg: id } });
        if (user) {
            return user.nickname;
        } else { return user }

    }

    static async checkQR(ctx, room) {
        let flag = false;
        const rooms = await MeetingRoom.findAll({ attributes: ['name'] });
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].name === room) {
                flag = true
                break;
            }
        }
        if (flag) {
            ctx.reply(`Вы подтвердили бронь в комнате`);
        } else {
            ctx.reply(`Не та комната`);
        }
    }

    static async doesUserExist(id) {
        const user = await Profile.findOne({ where: { id_tg: id } });
        return user;
    }

    static async setStartTime(date) {
        let now = moment();
        if (moment().format('YYYY-MM-DD') == date)
            now.minutes(Math.ceil(now.minutes() / 15) * 15)
        else {
            now.minutes('00')
            now.hours('00')
        }
        now = now.format('HH:mm')
        return now;
    }
}

module.exports = helperFunction;