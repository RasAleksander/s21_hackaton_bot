const { Telegraf, Markup, Input } = require('telegraf')
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
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
    static async getAvailableRange(visits) {
        let timeRanges = []
        let str = 'Доступные диапазоны:\n'
        for (let i = 0; i <= visits.length; i++) {
            let start = [0, 0]
            let end = [23, 59]
            if (i == 0 || i == visits.length) {
                if (i == 0) {
                    end = moment(visits[i].dataValues.start_time).format('HH:mm').split(':').map(Number);
                }
                if (i == visits.length) {
                    start = moment(visits[i - 1].dataValues.end_time).format('HH:mm').split(':').map(Number);
                }
            } else {
                start = moment(visits[i - 1].dataValues.end_time).format('HH:mm').split(':').map(Number);
                end = moment(visits[i].dataValues.start_time).format('HH:mm').split(':').map(Number);
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

    static async drawImage(bookings) {

        // const bookings = [
        //     { 'meeting_room_id': 1, 'start_time': '08:00', 'end_time': '08:30' },
        //     { 'meeting_room_id': 2, 'start_time': '09:00', 'end_time': '10:00' },
        //     { 'meeting_room_id': 3, 'start_time': '10:00', 'end_time': '11:45' },
        //     { 'meeting_room_id': 4, 'start_time': '13:45', 'end_time': '14:15' },
        //     { 'meeting_room_id': 5, 'start_time': '14:00', 'end_time': '15:00' },
        //     { 'meeting_room_id': 5, 'start_time': '16:30', 'end_time': '16:15' }
        // ];

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
        for (const booking of bookings) {
            const room = booking.meeting_room_id;
            const start_time = moment(booking.start_time).format("HH:mm")
            const end_time = moment(booking.end_time).format("HH:mm")
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
        fs.writeFileSync('booking_schedule_with_time_column.png', buffer);
    }
}

module.exports = helperFunction;