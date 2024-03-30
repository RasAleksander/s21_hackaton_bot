const { Scenes, WizardScene, Composer, Markup } = require('telegraf');
const sequelize = require('../database/database');
const Profile = require('../database/ProfilePeer');
const Visit = require('../database/VisitLog.js');
const Room = require('../database/MeetingRoom.js');
const City = require('../database/City');

const helperFunction = require('../functions/helperFunc');
const Calendar = require('telegram-inline-calendar');
const { startMessages, nicknameMessages } = require('../messages/Messages');
const { log } = require('forever');

class SceneGenerator {

    // Сцены для пользователя
    startScene() {
        const start = new Scenes.BaseScene('startScene')

        start.enter(async (ctx) => {
            // await Room.create({ name: 'Infinity', description: 'Ближайшая переговорка', floor: 20 })
            const userExists = await helperFunction.doesUserNickname(ctx.from.id);
            if (userExists) {
                await ctx.reply(startMessages.old_gamer + ` ${userExists}?`)
                ctx.scene.leave();
            } else {
                await ctx.reply(startMessages.new_gamer)
                ctx.scene.enter('nicknameScene')
            }
        })

        return start
    }


    //Выбор никнейма
    nicknameScene() {
        let userExists = null;
        const nicknameScene = new Scenes.BaseScene('nicknameScene');
        nicknameScene.enter(async (ctx) => {
            // проверка существует ли пользователь
            userExists = await helperFunction.doesUserNickname(ctx.from.id);
            if (userExists) {
                await ctx.reply(nicknameMessages.list);
            } else {
                await ctx.reply(nicknameMessages.new_gamer);
            }
        });
        nicknameScene.on('message', async (ctx) => {
            const nicknameReg = new RegExp('^[\\wа-яА-Я]{4,20}$');
            let nickname = ctx.message.text;

            // Некорректное имя
            if (!nicknameReg.test(nickname)) {
                await ctx.reply(nicknameMessages.wrong_nickname);
                ctx.scene.reenter();
            } else {
                // Корректное имя
                await ctx.reply(`${nicknameMessages.good_nickname} ${nickname}`);
                if (userExists) {
                    // если пользователь существует обновляем имя
                    await Profile.update({ nickname: nickname, username_tg: ctx.from.username }, { where: { id_tg: ctx.from.id } })
                    return ctx.scene.leave();
                } else {
                    // если пользователь новый заносим в базу данныч и идем в сцену смены города (опционально)
                    const username = ctx.from.username || 'default_username';
                    await Profile.create({ id_tg: ctx.from.id, tg_peername: username, nickname: nickname, city_id: 1, limit: 60 })
                    await ctx.reply(nicknameMessages.info_for_new)
                    // return ctx.scene.enter('cityScene');
                }
            }
        });
        return nicknameScene;
    }

    signupScene() {
        // Создаем шаг выбора типа игры
        const step1 = new Composer()
        const step2 = new Composer()
        const step3 = new Composer()
        const step4 = new Composer()
        const step5 = new Composer()
        let calendar;
        let date;
        let start_time;

        step1.on(`text`, async (ctx) => {
            const user = await helperFunction.doesUserExist(ctx.from.id)
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                calendar = new Calendar(ctx, {
                    date_format: 'DD-MM-YYYY',
                    language: 'ru',
                    start_week_day: 1,
                    bot_api: "telegraf",
                });
                calendar.startNavCalendar(ctx);
                return ctx.wizard.next();
            }
        });

        step2.on(`text`, async (ctx) => {
            const user = await helperFunction.doesUserExist(ctx.from.id)
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                calendar = new Calendar(ctx, {
                    date_format: 'DD-MM-YYYY',
                    language: 'ru',
                    start_week_day: 1,
                    bot_api: "telegraf",
                });
                calendar.startNavCalendar(ctx);
                return ctx.wizard.next();
            }
        });

        // Шаг выбора игры
        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                date = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (date !== -1) {

                    // await ctx.reply(`На сколько времени ты хочешь арендовать переговорку?`, {
                    //     reply_markup: {
                    //         inline_keyboard: [
                    //             [{ text: '15 мин', callback_data: 15 }],
                    //             [{ text: '30 мин', callback_data: 30 }],
                    //             [{ text: '45 мин', callback_data: 45 }],
                    //             [{ text: '60 мин', callback_data: 60 }],
                    //         ],
                    //         one_time_keyboard: true,
                    //     },
                    // })

                    await ctx.reply(`Вы выбрали ${date}`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Выбрать другой день', callback_data: 'other_day' }],
                            ],
                            one_time_keyboard: true,
                        },
                    });
                    calendar = new Calendar(ctx, {
                        date_format: 'HH:mm',
                        language: 'ru',
                        bot_api: "telegraf",
                        time_range: "00:00-23:59",
                        time_step: "15m"
                    });
                    calendar.startTimeSelector(ctx);
                    return ctx.wizard.next();
                }

            }
        });

        step3.on("callback_query", (ctx) => {
            console.log(ctx.callbackQuery.data)
            if (ctx.callbackQuery.data == 'other_day') {

                ctx.scene.reenter();
            }
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_time = calendar.clickButtonCalendar(ctx.callbackQuery);
                if (start_time !== -1) {
                    ctx.reply("You selected: " + date + ' ' + start_time);
                }
            }
        });

        step4.on('callback_query', async (ctx) => {

            let end_time = start_time + ctx.callbackQuery.data
            await ctx.reply(`Старт: ${start_time}, Конец: ${end_time}`)
            // await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: res, end_time: end_time })
            ctx.scene.leave()
        })



        const signup = new Scenes.WizardScene('signupScene', step1, step2, step3, step4, step5)
        return signup;
    }
    signupScene() {
        // Создаем шаг выбора типа игры
        const step2 = new Composer()
        const step3 = new Composer()
        const step4 = new Composer()
        let calendar
        let date, start_time;

        const step1 = async (ctx) => {
            const user = await helperFunction.doesUserExist(ctx.from.id)
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                calendar = new Calendar(ctx, {
                    date_format: 'DD-MM-YYYY',
                    language: 'ru',
                    start_week_day: 1,
                    bot_api: "telegraf",
                });
                calendar.startNavCalendar(ctx);
                return ctx.wizard.next();
            }
        };

        // Шаг выбора игры
        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                date = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (date !== -1) {

                    ctx.wizard.state.back_btn = await ctx.reply(`Вы выбрали ${date}`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Назад', callback_data: 'Back' }],
                            ],
                            one_time_keyboard: true,
                        },
                    });

                    calendar = new Calendar(ctx, {
                        date_format: 'HH:mm',
                        language: 'ru',
                        bot_api: "telegraf",
                        time_range: "00:00-23:59",
                        time_step: "15m"
                    });
                    calendar.startTimeSelector(ctx);
                    return ctx.wizard.next();
                }
            }
        });

        step3.on('callback_query', (ctx) => {
            if (ctx.callbackQuery.data == 'Back') {
                ctx.deleteMessage(ctx.wizard.state.back_btn.message_id);
                ctx.deleteMessage(calendar.chats.get(ctx.callbackQuery.message.chat.id));
                ctx.scene.reenter()
            }
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_time = calendar.clickButtonCalendar(ctx.callbackQuery);
                if (start_time !== -1) {
                    ctx.deleteMessage(ctx.wizard.state.back_btn.message_id);
                    ctx.reply("You selected: " + date + ' ' + start_time + '\n На сколько времени вы хотите забронировать комнату?', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '15 мин', callback_data: 15 }],
                                [{ text: '30 мин', callback_data: 30 }],
                                [{ text: '45 мин', callback_data: 45 }],
                                [{ text: '60 мин', callback_data: 60 }],
                            ],
                            one_time_keyboard: true,
                        }
                    });
                    return ctx.wizard.next();
                }
            }
        });

        step4.on('callback_query', async (ctx) => {

            let end_time = ctx.callbackQuery.data
            await ctx.reply(`Старт: ${Date(date + start_time)}, Конец:${end_time} `)
            // await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: res, end_time: end_time })
            ctx.scene.leave()
        })



        const signup = new Scenes.WizardScene('signupScene', step1, step2, step3, step4)
        // signup.hears('Back', goBackToStep1);
        return signup;
    }

}


module.exports = SceneGenerator;