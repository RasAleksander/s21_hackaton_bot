const { Scenes, WizardScene, Composer } = require('telegraf');
const { Markup } = require('telegraf');
const moment = require('moment');


const sequelize = require('../database/database');
const Profile = require('../database/ProfilePeer');
const Visit = require('../database/VisitLog.js');
const Room = require('../database/MeetingRoom.js');
const City = require('../database/City');
const Token = require('../database/TokenPeer');

const helperFunction = require('../functions/helperFunc');
const SendEmailsFunc = require('../functions/SendEmailsFunc');
const Calendar = require('telegram-inline-calendar');
const { startMessages, nicknameMessages } = require('../messages/Messages');

class SceneGenerator {

    startScene() {
        const start = new Scenes.BaseScene('startScene')
        start.enter(async (ctx) => {
            const userExists = await helperFunction.doesUserNickname(ctx.from.id);
            if (userExists) {
                await ctx.reply(greetingSignedupPeer.greetingOldPeer + ` ${userExists}?`)
                ctx.scene.leave();
            } else {
                await ctx.reply(greetingSignedupPeer.exception)
                ctx.scene.enter('nicknameScene')
            }
        })

        return start
    }


    nicknameScene() {
        const nicknameScene = new Scenes.BaseScene('nicknameScene');
        nicknameScene.enter(async (ctx) => {
            await ctx.reply('Введи свой nickname')
        });
        nicknameScene.on('message', async (ctx) => {
            const nicknameReg = new RegExp('^[\\wа-яА-Я]{4,20}$');
            let nickname = ctx.message.text;

            if (!nicknameReg.test(nickname)) {
                await ctx.reply(nicknameMessages.nicknameMessages);
                ctx.scene.reenter();
            } else {
                await SendEmailsFunc.sendEmail(nickname);
                await ctx.reply(nicknameMessages.correctNickname);
                // const tokenInfo = await Token.findOne({ where: { nickname: 'nickname' } });
                // const verifyValue = tokenInfo.verify;
                // console.log(verifyValue)
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
        let Button;
        let start_time;

        step1.on(`text`, async (ctx) => {
            const user = await helperFunction.doesUserExist(ctx.from.id)
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                const calendar = new Calendar(ctx, {
                    date_format: 'DD-MM-YYYY HH:mm',
                    language: 'ru',
                    start_week_day: 1,
                    bot_api: "telegraf",
                    time_selector_mod: true,
                    time_range: "00:00-24:00",
                    time_step: "15m"
                });
                calendar.startNavCalendar(ctx);
                Button = calendar

                return ctx.wizard.next();
            }
        });


        // Шаг выбора игры
        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == Button.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_time = await Button.clickButtonCalendar(ctx.callbackQuery);
                if (start_time !== -1) {
                    await ctx.reply(`На сколько времени ты хочешь арендовать переговорку?`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '15 мин', callback_data: 15 }],
                                [{ text: '30 мин', callback_data: 30 }],
                                [{ text: '45 мин', callback_data: 45 }],
                                [{ text: '60 мин', callback_data: 60 }],
                            ],
                            one_time_keyboard: true,
                        },
                    })

                    // await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: res, end_time: res })
                    return ctx.wizard.next();
                }
            }
        });


        step3.on('callback_query', async (ctx) => {

            let end_time = start_time + ctx.callbackQuery.data
            await ctx.reply(`Старт: ${start_time}, Конец: ${end_time}`)
            await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: res, end_time: end_time })
            ctx.scene.leave()
        })



        const signup = new Scenes.WizardScene('signupScene', step1, step2, step3, step4)
        return signup;
    }


    cancelScene() {
        const cancelScene = new Scenes.BaseScene('cancelScene');
        cancelScene.enter(async (ctx) => {
            const profile = await Profile.findOne({
                where: {
                    id_tg: ctx.from.id
                }
            });
            const bookings = await Visit.findAll({
                where: {
                    peer_id: profile.id,
                    status: 1 // выбираем только активные бронирования 
                }
            });

            if (bookings.length === 0) {
                await ctx.reply('У вас нет активных бронирований.');
                return ctx.scene.leave();
            }
            const buttons = [];

            // Создаем кнопки для каждого бронирования в цикле
            bookings.forEach((booking) => {
                const formattedStartTime = moment(booking.start_time).format('DD-MM-YYYY || HH:mm');
                const formattedEndTime = moment(booking.end_time).format('HH:mm');

                buttons.push(
                    Markup.button.callback(
                        `${formattedStartTime} - ${formattedEndTime}`,
                        `${booking.id}`
                    )
                );
            });

            // Создаем inline клавиатуру с кнопками
            const keyboard = Markup.inlineKeyboard(buttons);

            // Отправляем сообщение с inline клавиатурой
            await ctx.reply('Выберите бронирование для отмены:', keyboard);

            // return ctx.scene.leave();
        });

        cancelScene.on('callback_query', async (ctx) => {
            const bookingId = ctx.callbackQuery.data; // Указываем ctx перед callbackQuery
            const booking = await Visit.findOne({
                where: {
                    id: bookingId,
                }
            });
            if (!booking) {
                await ctx.reply('Бронь не найдена.');
            } else {
                await booking.update({ status: 3 }); // обновляем статус на "отменено"
                await ctx.reply('Бронь успешно отменена.');
            }

            return ctx.scene.leave();
        });

        return cancelScene;
    }

    adminScene() {
        const step1 = new Composer()
        const step2 = new Composer()
        step1.on(`text`, async (ctx) => {

            await ctx.reply('Какое действие вы хотите?', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Добавить новое пространство', callback_data: 'New_Space' }],
                        [{ text: 'Заблокировать пространство', callback_data: 'Block_Space' }],
                        [{ text: 'Разблокировать пространство', callback_data: 'Unblock_Space' }],
                        [{ text: 'Удалить пространство', callback_data: 'Delete_Space' }],
                    ],
                    one_time_keyboard: true,
                },

            })
            return ctx.wizard.next();
        })
        step2.on(`callback_query`, async (ctx) => {
            const chosenAction = ctx.callbackQuery.data;
            switch (chosenAction) {
                case 'New_Space':
                    ctx.scene.enter('newSpaceScene');
                    break;
                case 'Block_Space':
                    ctx.scene.enter('blockSpaceScene');
                    break;

                case 'Delete_Space':
                    ctx.scene.enter('deleteSpaceScene');
                    break;
                case 'Unblock_Space':
                    ctx.scene.enter('unblockSpaceScene');
                    break;
                default:
                    ctx.scene.leave();
                    break;
            }
        })
        const admin = new Scenes.WizardScene('adminScene', step1, step2)
        return admin;
    }

    blockSpaceScene() {
        // Создаем шаг выбора типа игры
        const step1 = new Composer()
        const step2 = new Composer()
        const step3 = new Composer()
        const step4 = new Composer()
        let Button;
        let start_time;

        step1.on(`callback_query`, async (ctx) => {
            const calendar = new Calendar(ctx, {
                date_format: 'DD-MM-YYYY HH:mm',
                language: 'ru',
                start_week_day: 1,
                bot_api: "telegraf",
                time_selector_mod: true,
                time_range: "00:00-24:00",
                time_step: "15m"
            });
            const user = await helperFunction.doesUserExist(ctx.from.id)
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                calendar.startNavCalendar(ctx);
                Button = calendar

                return ctx.wizard.next();
            }
        });

        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == Button.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_time = await Button.clickButtonCalendar(ctx.callbackQuery);
                if (start_time !== -1) {
                    await ctx.reply(`На сколько времени ты хочешь арендовать переговорку?`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '15 мин', callback_data: 15 }],
                                [{ text: '30 мин', callback_data: 30 }],
                                [{ text: '45 мин', callback_data: 45 }],
                                [{ text: '60 мин', callback_data: 60 }],
                            ],
                            one_time_keyboard: true,
                        },
                    })

                    // await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: res, end_time: res })
                    return ctx.wizard.next();
                }
            }
        });


        step3.on('callback_query', async (ctx) => {

            let end_time = start_time + ctx.callbackQuery.data
            await ctx.reply(`Старт: ${start_time}, Конец: ${end_time}`)
            await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: start_time, end_time: end_time })
            ctx.scene.leave()
        })



        const BblockSpace = new Scenes.WizardScene('blockSpaceScene', step1, step2, step3)
        return BblockSpace;
    }



}


module.exports = SceneGenerator;