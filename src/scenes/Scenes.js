const { Scenes, WizardScene, Composer } = require('telegraf');
const { Markup } = require('telegraf');
const moment = require('moment');


const sequelize = require('../database/database');
const Profile = require('../database/ProfilePeer');
const Visit = require('../database/VisitLog.js');
const Room = require('../database/MeetingRoom.js');
const City = require('../database/City');

const helperFunction = require('../functions/helperFunc');
const Calendar = require('telegram-inline-calendar');
const { startMessages, nicknameMessages } = require('../messages/Messages');
const { Sequelize, DataTypes } = require('sequelize');
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
            // await Visit.create({ meeting_room_id: 1, peer_id: 2, start_time: res, end_time: end_time })
            await Visit.create({ meeting_room_id: 1, peer_id: user.id, start_time: start_time, end_time: end_time, })
            ctx.scene.leave()
        })



        const signup = new Scenes.WizardScene('signupScene', step1, step2, step3, step4)
        // signup.hears('Back', goBackToStep1);
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

    blockSpaceScene() {// Шаг 1: Проверка существования пользователя
        const step1 = async (ctx) => {
            const user = await helperFunction.doesUserExist(ctx.from.id);
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                // Создаем календарь для выбора даты начала бронирования
                const startCalendar = new Calendar(ctx, {
                    date_format: 'YYYY-MM-DD',
                    language: 'ru',
                    start_week_day: 1,
                    bot_api: "telegraf",
                    start_date: 'now',
                });
                startCalendar.startNavCalendar(ctx);
                return ctx.wizard.next();
            }
        };

        // Шаг 2: Выбор даты начала бронирования
        const step2 = new Composer();

        // Обработчик callback-запросов для шага 2
        step2.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id === calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                const startDate = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (startDate !== -1) {
                    // Удаляем предыдущее сообщение с календарем
                    ctx.deleteMessage(delete_msg.message_id);

                    // Сохраняем выбранную дату начала бронирования в контексте
                    ctx.session.startDate = startDate;

                    // Выводим сообщение с запросом выбора времени начала бронирования
                    ctx.reply("Выберите время начала бронирования:");

                    // Создаем новый экземпляр календаря для выбора времени начала бронирования
                    const startTimeCalendar = new Calendar(ctx, {
                        date_format: 'HH:mm',
                        language: 'ru',
                        bot_api: "telegraf",
                        time_range: "00:00-23:45",
                        time_step: "15m",
                        custom_start_msg: 'Выберите время'
                    });

                    // Отображаем календарь для выбора времени начала бронирования
                    startTimeCalendar.startNavCalendar(ctx);

                    return ctx.wizard.next();
                }
            }
        });

        // Шаг 3: Выбор времени начала бронирования
        const step3 = new Composer();

        // Обработчик callback-запросов для шага 3
        step3.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id === calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                const startTime = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (startTime !== -1) {
                    // Удаляем предыдущее сообщение с календарем
                    ctx.deleteMessage(delete_msg.message_id);

                    // Сохраняем выбранное время начала бронирования в контексте
                    ctx.session.startTime = startTime;

                    // Выводим сообщение с запросом выбора даты и времени окончания бронирования
                    ctx.reply("Выберите дату и время окончания бронирования:");

                    // Создаем новый экземпляр календаря для выбора даты и времени окончания бронирования
                    const endTimeCalendar = new Calendar(ctx, {
                        date_format: 'YYYY-MM-DD',
                        language: 'ru',
                        start_week_day: 1,
                        bot_api: "telegraf",
                        start_date: 'now',
                    });

                    // Отображаем календарь для выбора даты и времени окончания бронирования
                    endTimeCalendar.startNavCalendar(ctx);

                    return ctx.wizard.next();
                }
            }
        });

        // Шаг 4: Выбор даты и времени окончания бронирования
        const step4 = new Composer();

        // Обработчик callback-запросов для шага 4
        step4.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.message.message_id === calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
                const endTime = await calendar.clickButtonCalendar(ctx.callbackQuery);
                if (endTime !== -1) {
                    // Удаляем предыдущее сообщение с календарем
                    ctx.deleteMessage(delete_msg.message_id);

                    // Сохраняем выбранную дату и время окончания бронирования в контексте
                    ctx.session.endTime = endTime;

                    // Выводим сообщение с информацией о выборе пользователя
                    ctx.reply(`Выбранное время окончания: ${endTime}`);

                    // Создаем новый экземпляр календаря для выбора даты и времени окончания бронирования
                    const endTimeCalendar = new Calendar(ctx, {
                        date_format: 'YYYY-MM-DD',
                        language: 'ru',
                        start_week_day: 1,
                        bot_api: "telegraf",
                        start_date: 'now',
                    });

                    // Отображаем календарь для выбора даты и времени окончания бронирования
                    endTimeCalendar.startNavCalendar(ctx);

                    return ctx.wizard.next();
                }
            }
        });

        // Шаг 5: Сохранение и вывод информации о бронировании
        const step5 = async (ctx) => {
            // Получаем информацию о бронировании из контекста
            const { startDate, startTime, endTime } = ctx.session;

            // Отправляем сообщение с информацией о бронировании
            await ctx.reply(`Вы выбрали: 
            Начало бронирования: ${startDate} ${startTime}
            Окончание бронирования: ${endDate} ${endTime}`);

            // Создаем запись о бронировании в базе данных или выполняем другие необходимые действия

            // Завершаем сцену
            return ctx.scene.leave();
        };

        // Добавляем шаги в сцену
        blockSpaceScene.register(step1, step2, step3, step4, step5);
    }



}


module.exports = SceneGenerator;