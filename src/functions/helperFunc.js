const { Telegraf, Markup, Input } = require('telegraf')
const { Sequelize } = require('sequelize');
const moment = require('moment');
const axios = require('axios');
require('dotenv').config()
const sequelize = require('../database/database');
const Visit = require('../database/VisitLog.js');
const Admin = require('../database/ProfileAdmin');
const Profile = require('../database/ProfilePeer');
const MeetingRoom = require('../database/MeetingRoom');

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

    static async doesAdminExist(id) {
        const user = await Profile.findOne({ where: { id_tg: id } });
        if (!user) {
            return false;
        }
        const isAdmin = await Admin.findOne({ where: { peer_id: user.id } });
        return isAdmin;
    }


    static async sendMessage(id_tg, message) {
        try {
            const token = process.env.BOT_TOKEN; // Замените на ваш токен бота
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            const payload = {
                chat_id: id_tg,
                text: message
            };
            const response = await axios.post(url, payload);
            console.log('Message sent:', response.data);
        } catch (error) {
            console.error('Error sending message:', error.message);
        }

    }

    static async runScript() {
        // Найти текущее время и время, которое наступит через 59 минут
        const currentTime = moment();
        const endTimeThreshold = moment().add(15, 'minutes');

        // Найти все записи, у которых время окончания находится в промежутке между текущим временем и endTimeThreshold
        const bookings = await Visit.findAll({
            where: {
                [Sequelize.Op.and]: [
                    {
                        end_time: {
                            [Sequelize.Op.lte]: endTimeThreshold.toDate() // Найти записи, где end_time меньше или равно времени, через 59 минут
                        }

                    },
                    {
                        end_time: {
                            [Sequelize.Op.gte]: currentTime.toDate() // И одновременно больше или равно текущему времени
                        }
                    }
                ]
            }
        });

        // Отправить сообщение всем пользователям из таблицы Visit
        for (const booking of bookings) {
            const { peer_id } = booking;
            const profile = await Profile.findOne({ where: { id: peer_id } }); // Найти профиль пользователя по его идентификатору
            console.log('пирайди' + peer_id)
            const { id_tg } = profile;
            console.log('\nТгайди' + id_tg)
            if (profile) {
                // const { id_tg } = profile;
                console.log('Зашли в рассылку')
                const timeDiffMinutes = moment(booking.end_time).diff(currentTime, 'minutes');
                const message = `Ваше бронирование заканчивается через ${timeDiffMinutes} минут`;
                await helperFunction.sendMessage(id_tg, message);
            }
        }
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