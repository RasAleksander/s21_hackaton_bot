const { Telegraf, Markup, Input } = require('telegraf')
const sequelize = require('../database/database');
// const Admin = require('../database/AdminModel'); // Модель списка админов
const Profile = require('../database/ProfilePeer'); // Модель списка админов
const MeetingRoom = require('../database/MeetingRoom');
const VisitLog = require('../database/VisitLog');

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
}

module.exports = helperFunction;