// Библиотеки и фреймворки
const { Scenes, WizardScene, Composer } = require('telegraf');
const { Sequelize, DataTypes } = require('sequelize');
const { Markup } = require('telegraf');
const moment = require('moment');
const Calendar = require('telegram-inline-calendar');


// Таблицы
const Profile = require('../database/ProfilePeer');
const Admin = require('../database/ProfileAdmin');
const Visit = require('../database/VisitLog.js');
const Room = require('../database/MeetingRoom.js');


// Файлы
const helperFunction = require('../functions/helperFunc');
const { greetingSignedupPeer,
    greetingUnsignedPeer,
    nicknameMessages,
    signupMessages,
    dialoguesMessages,
    extensionBooking,
    adminMessages } = require('../messages/Messages');




class SceneGenerator {

    // Сцены для пользователя
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
        // Создаем шаг выбора типа игры
        const step2 = new Composer()
        const step3 = new Composer()
        const step4 = new Composer()
        const step5 = new Composer()
        let calendar, user;

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

        // Шаг выбора игры
        let selected_date = 0;
        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                selected_date = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (selected_date !== -1) {
                    const visits = await Visit.findAll({
                        where: {
                            start_time: {
                                [Sequelize.Op.between]: [moment(selected_date), moment(selected_date).add(1, 'days')]
                            }
                        }
                    });
                    await helperFunction.drawImage(visits);
                    const rooms = await Room.findAll();
                    const inlineKeyboard = rooms.map(room => [{
                        text: room.name,
                        callback_data: `${room.id}`,
                    }]);
                    inlineKeyboard.push([{ text: 'Назад', callback_data: '0' }]);
                    delete_msg = await ctx.reply(`Вы выбрали ${selected_date}. Выберите переговорку`, {
                        reply_markup: {
                            inline_keyboard: inlineKeyboard,
                            one_time_keyboard: true,
                        },
                    });
                    return ctx.wizard.next();

                }
            }
        });

        let [str, time_ranges] = [];
        let selected_room = 0;
        step3.on('callback_query', async (ctx) => {
            ctx.deleteMessage(delete_msg.message_id);
            if (ctx.callbackQuery.data == '0') {
                ctx.scene.reenter()
            } else {
                selected_room = ctx.callbackQuery.data;
                [str, time_ranges] = await helperFunction.getAvailableRange(selected_room, selected_date);
                const start = await helperFunction.setStartTime(selected_date)
                calendar = new Calendar(ctx, {
                    date_format: 'HH:mm',
                    language: 'ru',
                    bot_api: "telegraf",
                    time_range: start + "-23:59",
                    time_step: "15m",
                    custom_start_msg: str + 'Выберите время'
                });
                calendar.startTimeSelector(ctx);
            }
            return ctx.wizard.next();
        });

        let start_time = 0
        step4.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                start_time = calendar.clickButtonCalendar(ctx.callbackQuery);
                if (start_time !== -1) {
                    let check = await helperFunction.checkTimeRange(time_ranges, start_time);
                    if (!check) {
                        calendar.options.custom_start_msg = "Это время занято! Выбери другое время!\n" + calendar.options.custom_start_msg
                        console.log(calendar.options.custom_start_msg)
                        calendar.startTimeSelector(ctx);
                        return
                    } else {
                        // if (delete_msg != undefined) ctx.deleteMessage(delete_msg.message_id)
                        if (user.limit > 0) {
                            const inlineKeyboard = []
                            for (let limit = user.limit; limit > 0; limit -= 15) {
                                inlineKeyboard.push([{ text: limit + ' мин', callback_data: limit }]);
                            }
                            ctx.reply("Вы выбрали: " + selected_date + ' ' + start_time + '\nОставшийся лимит: ' + user.limit + '\n На сколько времени вы хотите забронировать комнату?', {
                                reply_markup: {
                                    inline_keyboard: inlineKeyboard,
                                    one_time_keyboard: true,
                                }
                            });
                            return ctx.wizard.next();
                        } else {
                            ctx.reply("У вас закончился лимит времени на бронирование комнат.");
                            return ctx.scene.leave();
                        }
                    }
                }
            }
        });

        step5.on('callback_query', async (ctx) => {
            const selected_time = parseInt(ctx.callbackQuery.data, 10)
            start_time = moment(selected_date + ' ' + start_time)
            let end_time = moment(start_time)
            end_time.add(selected_time, 'minutes')
            await ctx.editMessageText(`Вы забронировали комнату на: ${start_time}\nдо: ${end_time}`)
            await Visit.create({ meeting_room_id: selected_room, peer_id: user.id, start_time: start_time, end_time: end_time, })
            await Profile.decrement('limit', { by: selected_time, where: { id: user.id } });
            ctx.scene.leave()
        })



        const signup = new Scenes.WizardScene('signupScene', step1, step2, step3, step4, step5)
        // signup.hears('Back', goBackToStep1);
        return signup;
    }


    bookingsScene() {
        const bookingsScene = new Scenes.BaseScene('bookingsScene');
        bookingsScene.enter(async (ctx) => {
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
                const formattedStartTime = moment(booking.start_time).format('DD-MM || HH:mm');
                const formattedEndTime = moment(booking.end_time).format('HH:mm');

                buttons.push(
                    Markup.button.callback(
                        `RoomID:${booking.meeting_room_id} ${formattedStartTime} - ${formattedEndTime}`,
                        `${booking.id}`
                    )
                );
            });

            // Создаем inline клавиатуру с кнопками
            const keyboard = Markup.inlineKeyboard(buttons);

            // Отправляем сообщение с inline клавиатурой
            await ctx.reply('Ваши активные бронирования.\nКликните, чтобы отменить', keyboard);

            // return ctx.scene.leave();
        });

        bookingsScene.on('callback_query', async (ctx) => {
            const bookingId = ctx.callbackQuery.data;
            const booking = await Visit.findOne({
                where: {
                    id: bookingId,
                }
            });
            if (!booking) {
                await ctx.reply('Бронь не найдена.');
            } else {
                await booking.update({ status: 3 });
                await helperFunction.addToLimitByVisitId(bookingId)
                await ctx.reply('Бронь успешно отменена.');
            }

            return ctx.scene.leave();
        });

        return bookingsScene;
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
                        [{ text: 'Добавить администратора', callback_data: 'Add_Admin' }]
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
                case 'Add_Admin':
                    ctx.scene.enter('addAdminScene');
                    break;
                case 'Block_Space':
                    ctx.scene.enter('blockSpaceScene');
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

    newSpaceScene() {
        // Шаги сцены
        const step1 = async (ctx) => {
            await ctx.reply('Введите название пространства:');
            return ctx.wizard.next();
        };

        const step2 = async (ctx) => {
            ctx.session.meetingRoom = { name: ctx.message.text };
            await ctx.reply('Введите описание пространства:');
            return ctx.wizard.next();
        };

        const step3 = async (ctx) => {
            ctx.session.meetingRoom.description = ctx.message.text;
            await ctx.reply('Введите номер этажа:');
            return ctx.wizard.next();
        };

        const step4 = async (ctx) => {
            const { name, description } = ctx.session.meetingRoom;
            const floor = parseInt(ctx.message.text);

            try {
                // Создаем новое пространство в базе данных
                const meetingRoom = await Room.create({ name, description, floor });
                await ctx.reply(`Пространство "${name}" успешно создано! ID: ${meetingRoom.id}`);
            } catch (error) {
                console.error('Ошибка при создании пространства:', error);
                await ctx.reply('Произошла ошибка при создании пространства. Пожалуйста, попробуйте еще раз.');
            }

            // Завершаем сцену
            return ctx.scene.leave();
        };

        // Создаем сцену
        const newSpaceScene = new Scenes.WizardScene('newSpaceScene', step1, step2, step3, step4
        );
        return newSpaceScene
    }

    blockSpaceScene() {// Создаем шаг выбора типа игры
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

        // Шаг выбора игры
        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                date = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (date !== -1) {
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
            // await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: res, end_time: end_time })
            await Visit.create({ meeting_room_id: 1, peer_id: user.id, start_time: start_time, end_time: end_time, })
            ctx.scene.leave()
        })


        const blockSpaceScene = new Scenes.WizardScene('blockSpaceScene', step1, step2, step3, step4)
        // signup.hears('Back', goBackToStep1);
        return blockSpaceScene;
    }

    addAdminScene() {
        const addAdminScene = new Scenes.BaseScene('addAdminScene');
        addAdminScene.enter(async (ctx) => {
            await ctx.reply('Введите никнейм пользователя:');
        })
        addAdminScene.on('message', async (ctx) => {

            const nickname = ctx.message.text.trim();

            // Проверяем, существует ли такой никнейм в таблице ProfilePeer
            const profilePeer = await Profile.findOne({ where: { nickname } });

            if (!profilePeer) {
                await ctx.reply('Пользователь с таким никнеймом не найден.');
                return ctx.scene.leave();
            }

            // Проверяем, существует ли уже администратор с таким же peer_id
            const existingAdmin = await Admin.findOne({ where: { peer_id: profilePeer.id } });

            if (existingAdmin) {
                await ctx.reply('Этот пользователь уже является администратором.');
                return ctx.scene.leave();
            }

            // Создаем новую запись в таблице ProfileAdmin
            await Admin.create({ peer_id: profilePeer.id });

            await ctx.reply(`Пользователь "${nickname}" успешно добавлен в администраторы.`);

            return ctx.scene.leave();

        })
        return addAdminScene
    }



}


module.exports = SceneGenerator;
