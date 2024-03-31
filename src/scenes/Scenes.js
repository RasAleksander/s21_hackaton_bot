const { Scenes, WizardScene, Composer, Markup } = require('telegraf');
const sequelize = require('../database/database');
const Profile = require('../database/ProfilePeer');
const Visit = require('../database/VisitLog.js');
const Room = require('../database/MeetingRoom.js');
const City = require('../database/City');

const helperFunction = require('../functions/helperFunc');
const sendEmailsFunc = require('../functions/sendEmailsFunc');
const Calendar = require('telegram-inline-calendar');
const { startMessages, nicknameMessages } = require('../messages/Messages');
const { Sequelize, DataTypes } = require('sequelize');
const { log } = require('forever');
const moment = require('moment');


class SceneGenerator {

    startScene() {
        const start = new Scenes.BaseScene('startScene')
        start.enter(async (ctx) => {
            const userExists = await helperFunction.doesUserNickname(ctx.from.id);
            if (userExists) {
                await ctx.reply(greetingSignedupPeer.greetingOldPeer)
                ctx.scene.leave();
            } else {
                await ctx.reply(greetingUnsignedPeer.greetingNewPeer)
                ctx.scene.enter('nicknameScene')
            }
        })
        return start
    }

    nicknameScene() {
        let userExists = null;
        const nicknameScene = new Scenes.BaseScene('nicknameScene');
        nicknameScene.enter(async (ctx) => {
            userExists = await helperFunction.doesUserNickname(ctx.from.id);
            if (userExists) {
                await ctx.reply(greetingSignedupPeer.greetingOldPeer)
                ctx.scene.leave();
            } else {
                await ctx.reply(greetingUnsignedPeer.exception);
            }
        });
        nicknameScene.on('message', async (ctx) => {
            await ctx.reply(nicknameMessages.newPeer);
            const nicknameReg = new RegExp('^[\\wа-яА-Я]{4,20}$');
            let nickname = ctx.message.text;

            // Некорректное имя
            if (!nicknameReg.test(nickname)) {
                await ctx.reply(nicknameMessages.wrongNickname);
                ctx.scene.reenter();
            } else {
                // Корректное имя
                // await sendEmailsFunc.sendEmail(nickname);
                const username = ctx.from.username || 'default_username';
                await Profile.create({ id_tg: ctx.from.id, tg_peername: username, nickname: nickname, city_id: 1, limit: 60 })
                await ctx.reply(`${nicknameMessages.correctNickname} ${nickname}`);
            }
        });
        return nicknameScene;
    }

    signupScene() {
        const step2 = new Composer()
        const step3 = new Composer()
        const step4 = new Composer()
        let calendar, user;
        let date, start_time;
        let delete_msg;

        const step1 = async (ctx) => {
            user = await helperFunction.doesUserExist(ctx.from.id)
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                calendar = new Calendar(ctx, {
                    date_format: 'YYYY-MM-DD',
                    language: 'ru',
                    start_week_day: 1,
                    bot_api: "telegraf",
                    start_date: 'now',
                });
                calendar.startNavCalendar(ctx);
                return ctx.wizard.next();
            }
        };

        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                date = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (date !== -1) {
                    let start_date = moment(date), end_date = moment(date).add(1, 'days');
                    const visits = await Visit.findAll({
                        where: {
                            start_time: {
                                [Sequelize.Op.between]: [start_date, end_date]
                            }
                        }
                    });

                    delete_msg = await ctx.reply(`Вы выбрали ${date}`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Назад', callback_data: 'Back' }],
                            ],
                            one_time_keyboard: true,
                        },
                    });

                    const start = await helperFunction.setStartTime(date)
                    calendar = new Calendar(ctx, {
                        date_format: 'HH:mm',
                        language: 'ru',
                        bot_api: "telegraf",
                        time_range: start + "-23:59",
                        time_step: "15m",
                        custom_start_msg: 'Выберите время'
                    });

                    calendar.startTimeSelector(ctx);
                    return ctx.wizard.next();

                }
            }
        });

        step3.on('callback_query', (ctx) => {
            if (ctx.callbackQuery.data == 'Back') {
                ctx.deleteMessage(delete_msg.message_id);
                ctx.deleteMessage(calendar.chats.get(ctx.callbackQuery.message.chat.id));
                ctx.scene.reenter()
            }
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_time = calendar.clickButtonCalendar(ctx.callbackQuery);
                if (start_time !== -1) {
                    ctx.deleteMessage(delete_msg.message_id);
                    ctx.reply("You selected: " + date + ' ' + start_time + '\n На сколько времени вы хотите забронировать комнату?', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '15 мин', callback_data: 15 },
                                { text: '30 мин', callback_data: 30 },
                                { text: '45 мин', callback_data: 45 },
                                { text: '60 мин', callback_data: 60 }]
                            ],
                            one_time_keyboard: true,
                        }
                    });
                    return ctx.wizard.next();
                }
            }
        });

        step4.on('callback_query', async (ctx) => {

            start_time = moment(date + ' ' + start_time)
            let end_time = moment(start_time)
            end_time.add(parseInt(ctx.callbackQuery.data, 10), 'minutes')
            await ctx.reply(`Старт: ${start_time}, Конец: ${end_time}`)
            await Visit.create({ meeting_room_id: 1, peer_id: user.id, start_time: start_time, end_time: end_time, })
            ctx.scene.leave()
        })

        const signup = new Scenes.WizardScene('signupScene', step1, step2, step3, step4)
        // signup.hears('Back', goBackToStep1);
        return signup;
    }




    
    signupAdminScene() {
        const step1 = new Composer(); // Шаг выбора начальной даты
        const step2 = new Composer(); // Шаг выбора времени начала бронирования
        const step3 = new Composer(); // Шаг выбора конечной даты
        const step4 = new Composer(); // Шаг выбора времени окончания бронирования
        const step5 = new Composer(); // Шаг завершения бронирования
        let calendarStart, calendarEnd, user;
        let start_date, start_time, end_date, end_time;
    
        step1.enter(async (ctx) => {
            user = await helperFunction.doesUserExist(ctx.from.id); //Нужна проверка на админа 
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                calendarStart = new Calendar(ctx, {
                    date_format: 'YYYY-MM-DD',
                    language: 'ru',
                    start_week_day: 1,
                    bot_api: "telegraf",
                    start_date: 'now',
                });
                calendarStart.startNavCalendar(ctx);
                return ctx.wizard.next();
            }
        });
    
        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendarStart.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_date = await calendarStart.clickButtonCalendar(ctx.callbackQuery);
                if (start_date !== -1) {
                    let start = await helperFunction.setStartTime(start_date)
                    const startCalendar = new Calendar(ctx, {
                        date_format: 'HH:mm',
                        language: 'ru',
                        bot_api: "telegraf",
                        time_range: start + "-23:59",
                        time_step: "15m",
                        custom_start_msg: 'Выберите время начала бронирования'
                    });
                    startCalendar.startTimeSelector(ctx);
                    return ctx.wizard.next();
                }
            }
        });
    
        step3.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == startCalendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_time = await startCalendar.clickButtonCalendar(ctx.callbackQuery);
                if (start_time !== -1) {
                    calendarEnd = new Calendar(ctx, {
                        date_format: 'YYYY-MM-DD',
                        language: 'ru',
                        start_week_day: 1,
                        bot_api: "telegraf",
                        start_date: start_date,
                    });
                    calendarEnd.startNavCalendar(ctx);
                    return ctx.wizard.next();
                }
            }
        });
    
        step4.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendarEnd.chats.get(ctx.callbackQuery.message.chat.id)) {
                end_date = await calendarEnd.clickButtonCalendar(ctx.callbackQuery);
                if (end_date !== -1) {
                    const endCalendar = new Calendar(ctx, {
                        date_format: 'HH:mm',
                        language: 'ru',
                        bot_api: "telegraf",
                        time_range: "00:00-23:59",
                        time_step: "15m",
                        custom_start_msg: 'Выберите время окончания бронирования'
                    });
                    endCalendar.startTimeSelector(ctx);
                    return ctx.wizard.next();
                }
            }
        });

        step5.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == endCalendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                end_time = await endCalendar.clickButtonCalendar(ctx.callbackQuery);
                if (end_time !== -1) {
                    await Visit.create({ 
                        meeting_room_id: 1, 
                        peer_id: user.id, 
                        start_time: moment(start_date + ' ' + start_time), 
                        end_time: moment(end_date + ' ' + end_time)
                    });
                    await ctx.reply(`Бронирование завершено: С ${start_date} ${start_time} по ${end_date} ${end_time}`);
                    ctx.scene.leave();
                }
            }
        });

        const signupAdmin = new Scenes.WizardScene('signupAdminScene', step1, step2, step3, step4, step5);
        return signupAdmin;
    }

}


module.exports = SceneGenerator;