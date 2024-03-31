const { Telegraf, Markup, Input } = require('telegraf')
const { Sequelize } = require('sequelize');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
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
            const token = process.env.BOT_TOKEN;
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

        const currentTime = moment();
        const endTimeThreshold = moment().add(16, 'minutes');
        const startTimeThreshold = moment().subtract(16, 'minutes'); // Время, наступающее через 15 минут назад

        // Найти все записи, у которых время окончания находится в промежутке между текущим временем и endTimeThreshold
        const bookings = await Visit.findAll({
            where: {
                [Sequelize.Op.and]: [
                    {
                        [Sequelize.Op.or]: [
                            {
                                end_time: {
                                    [Sequelize.Op.lte]: endTimeThreshold.toDate()
                                }
                            },
                            {
                                start_time: {
                                    [Sequelize.Op.lte]: startTimeThreshold.toDate()
                                }
                            }
                        ]
                    },
                    {
                        [Sequelize.Op.or]: [
                            {
                                end_time: {
                                    [Sequelize.Op.gte]: currentTime.toDate()
                                }
                            },
                            {
                                start_time: {
                                    [Sequelize.Op.gte]: currentTime.toDate()
                                }
                            }
                        ]
                    }
                ]
            }
        });


        // Отправить сообщение всем пользователям из таблицы Visit
        for (const booking of visits) {
            const { peer_id } = booking;
            const profile = await Profile.findOne({ where: { id: peer_id } }); // Найти профиль пользователя по его идентификатору
            console.log('пирайди' + peer_id)
            const { id_tg } = profile;
            console.log('\nТгайди' + id_tg)
            if (profile) {
                // const { id_tg } = profile;
                console.log('Зашли в рассылку')
                const timeDiffMinutes = moment(booking.end_time).diff(currentTime, 'minutes');
                const message = `Ваше бронирование начинается/заканчивается через ${timeDiffMinutes} минут`;
                await helperFunction.sendMessage(id_tg, message);
            }
        }
    }

    static async addToLimitByVisitId(visitId) {
        try {
            // Находим запись в таблице VisitLog по id
            const visit = await Visit.findByPk(visitId);
            if (!visit) {
                throw new Error('Запись с таким id не найдена');
            }
            const start = visit.start_time.getTime();
            const end = visit.end_time.getTime();
            const differenceInMinutes = Math.ceil((end - start) / (1000 * 60));

            const user = await Profile.findByPk(visit.peer_id);
            if (!user) {
                throw new Error('Пользователь с таким peer_id не найден');
            }

            user.limit += differenceInMinutes;
            await user.save();

            return `Лимит пользователя ${user.nickname} успешно обновлен на ${differenceInMinutes} минут`;
        } catch (error) {
            return `Произошла ошибка: ${error.message}`;
        }
    }

    static async updateStatusAndAddToLimit() {
        try {
            // Находим все записи в таблице VisitLog, у которых разница между end_time и текущим временем равна 0 в минутах
            const currentDateTime = moment();
            const expiredVisits = await Visit.findAll({
                where: {
                    end_time: {
                        [Sequelize.Op.lte]: currentDateTime.toDate() // Находим записи, у которых end_time меньше или равно текущему времени
                    }
                }
            });

            // Обновляем статус для найденных записей и вызываем функцию addToLimitByVisitId
            for (const visit of expiredVisits) {
                visit.status = 2; // Устанавливаем статус 2 (или любой другой, который вам нужен)
                await visit.save(); // Сохраняем изменения
                await helperFunction.addToLimitByVisitId(visit.id); // Вызываем функцию для добавления к лимиту
            }

            return `Успешно обновлено ${expiredVisits.length} записей и добавлено к лимиту`;
        } catch (error) {
            return `Произошла ошибка: ${error.message}`;
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

    static async getAvailableRange(selected_room, selected_date,) {
        const visits = await Visit.findAll({
            where: {
                meeting_room_id: selected_room,
                start_time: {
                    [Sequelize.Op.between]: [moment(selected_date), moment(selected_date).add(1, 'days')]
                }
            },
            attributes: ['start_time', 'end_time'], // Указываем имена атрибутов в виде строковых значений
            order: [['start_time', 'ASC']]
        });
        let timeRanges = []
        let str = 'Доступные диапазоны:\n'

        for (let i = 0; i <= visits.length; i++) {
            let start = [0, 0]
            let end = [23, 59]
            if (visits.length) {
                if (i == 0) {
                    end = moment(visits[i].dataValues.start_time).format('HH:mm').split(':').map(Number);
                } else if (i == visits.length) {
                    start = moment(visits[i - 1].dataValues.end_time).format('HH:mm').split(':').map(Number);
                } else {
                    start = moment(visits[i - 1].dataValues.end_time).format('HH:mm').split(':').map(Number);
                    end = moment(visits[i].dataValues.start_time).format('HH:mm').split(':').map(Number);
                }
            }
            if (!(start[0] == end[0] && start[1] == end[1])) {
                str += start[0] + ':' + start[1] + '-' + end[0] + ':' + end[1] + '\n'
                timeRanges.push({ start_hour: start[0], start_minutes: start[1], end_hour: end[0], end_minutes: end[1] })
            }
        }
        return [str, timeRanges]
    }

    static async checkTimeRange(time_ranges, selected_time) {
        let flag = false
        const [input_hour, input_minutes] = selected_time.split(':').map(Number);
        for (let i = 0; i < time_ranges.length; i++) {
            const startTotalMinutes = time_ranges[i].start_hour * 60 + time_ranges[i].start_minutes;
            const endTotalMinutes = time_ranges[i].end_hour * 60 + time_ranges[i].end_minutes;
            const inputTotalMinutes = input_hour * 60 + input_minutes;

            flag = (inputTotalMinutes >= startTotalMinutes && inputTotalMinutes <= endTotalMinutes);
            if (flag) break;

        }
        return flag
    }

    static async drawImage(selected_date) {
        const visits = await Visit.findAll({
            where: {
                start_time: {
                    [Sequelize.Op.between]: [moment(selected_date), moment(selected_date).add(1, 'days')]
                }
            }
        });

        const canvasWidth = 850; // Увеличили ширину для столбца времени
        const canvasHeight = 400;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Рисуем шкалу времени слева
        ctx.fillStyle = 'black';
        ctx.font = '14px Arial';
        for (let hour = 0; hour <= 24; hour += 1) {
            const y = (hour / 24) * canvasHeight + 9;
            ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, 5, y + 5);
        }

        // Рисуем сетку
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 2;
        for (let room = 0; room < 5; room++) {
            const x = room * ((canvasWidth - 50) / 5); // Изменили делитель для столбцов
            ctx.beginPath();
            ctx.moveTo(x + 50, 0);
            ctx.lineTo(x + 50, canvasHeight);
            ctx.stroke();
        }

        for (let hour = 0; hour <= 24; hour++) {
            const y = (hour / 24) * canvasHeight;
            ctx.beginPath();
            ctx.moveTo(0, y); // Изменили x координату для столбца времени
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }

        // Рисуем занятые ячейки в красном цвете
        ctx.fillStyle = 'red';
        for (const visit of visits) {
            const room = visit.meeting_room_id;
            const start_time = moment(visit.start_time).format("HH:mm")
            const end_time = moment(visit.end_time).format("HH:mm")
            const [startHour, startMinute] = start_time.split(':').map(Number);
            const [endHour, endMinute] = end_time.split(':').map(Number);
            if (startHour <= endHour) {
                const start_y = ((startHour * 60 + startMinute) / (24 * 60)) * canvasHeight;
                const end_y = ((endHour * 60 + endMinute) / (24 * 60)) * canvasHeight;
                ctx.fillRect((room - 1) * ((canvasWidth - 50) / 5) + 50, start_y, (canvasWidth - 50) / 5, end_y - start_y);
            }
        }
        // Сохраняем изображение
        const buffer = canvas.toBuffer('image/png');
        // fs.writeFileSync('booking_schedule_with_time_column.png', buffer);
        return buffer;
    }
}

module.exports = helperFunction;