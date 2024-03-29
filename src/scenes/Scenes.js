const { Scenes, WizardScene, Composer, Markup } = require('telegraf');
const sequelize = require('../database/database');
const Profile = require('../database/ProfileModel');

const helperFunction = require('../functions/helperFunc');
const { startMessages, nicknameMessages } = require('../messages/Messages');

class SceneGenerator {

    // Сцены для пользователя
    startScene() {
        const start = new Scenes.BaseScene('startScene')

        start.enter(async (ctx) => {
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
                    // если пользователь новый заносим в базу данныч и идем в сцену смены города
                    const username = ctx.from.username || 'default_username';
                    await Profile.create({ id_tg: ctx.from.id, nickname: nickname, limit: 60, tg_username: username })
                    await ctx.reply(nicknameMessages.info_for_new)
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
        const step6 = new Composer()

        // Шаг выбора типа мафии
        let Table;

        step1.on(`text`, async (ctx) => {
            const user = await helperFunction.doesUserExist(ctx.from.id)
            if (!user) {
                await ctx.reply(signupMessages.notUser);
                return ctx.scene.leave();
            } else {
                ctx.session.nickname = user.nickname;
                await ctx.reply(`${signupMessages.whichType}`, {
                    reply_markup: {
                        inline_keyboard: helperFunction.inline_keyboard,
                        one_time_keyboard: true
                    },
                });
                // выводим кнопки типа мафии
                return ctx.wizard.next();
            }
        });


        // Шаг выбора игры
        step2.on('callback_query', async (ctx) => {
            ctx.session.typeGame = ctx.callbackQuery.data; // Сохраняем выбор типа игры
            const tableName = 'GameList' + ctx.session.typeGame;
            Table = sequelize.models[tableName];
            try {
                const games = await Table.findAll();

                if (games.length) { // если есть игр
                    const inlineKeyboard = games.map(game => [{
                        text: game.header,
                        callback_data: `${game.id}`,
                    }]);
                    await helperFunction.outputListButtons(ctx, signupMessages.listGames, inlineKeyboard); // Выводим спиок игр
                    return ctx.wizard.next();

                } else {
                    await ctx.editMessageText(signupMessages.noGames);
                    const tableName = 'WaitList' + ctx.session.typeGame;
                    Table = sequelize.models[tableName];
                    const gamer = await Table.findOne({ where: { id_tg: ctx.from.id } });

                    if (!gamer) {
                        await Table.create({ id_tg: ctx.from.id, nickname: ctx.session.nickname }); // записываем в waitlist
                    }
                    return ctx.scene.leave();
                }
            }
            catch (error) {
                ctx.reply("Кажется у меня какие-то неточные сведения, попробуй повторить запрос с самого начала, постарайся не использовать кнопки из сообщений выше, а если не поможет - напиши @Lorasal, он поможет и разберется")
                ctx.scene.leave()
            }
        });

        // когда выбрали игру выводим полную афишу
        step3.on('callback_query', async (ctx) => {
            ctx.session.game_id = ctx.callbackQuery.data
            const game_id = ctx.session.game_id;

            if (game_id === '0') {
                await ctx.editMessageText(signupMessages.exit); // если нажали кнопку выхода из сцены
                return ctx.scene.leave();
            }

            const game = await Table.findOne({ where: { id: game_id } });
            ctx.session.header = game.header;
            ctx.session.price = game.price;
            ctx.session.image = game.image;

            await ctx.editMessageText(
                game.header + '\n' + game.description + '\nЦена: ' + `${Math.round(game.price)}` + '\n' + signupMessages.posterText + '\n<a href="' + game.image + '">&#8205;</a>', // выводим полную афишу
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Записаться на игру', callback_data: 'sign_up' }],
                            [{ text: 'Вернуться в главное меню', callback_data: '0' }]
                        ],
                        one_time_keyboard: true
                    }
                },
            );
            return ctx.wizard.next();
        });

        step4.on('callback_query', async (ctx) => {
            ctx.wizard.state.choice = ctx.callbackQuery.data

            if (ctx.wizard.state.choice === '0') {
                await ctx.editMessageText(signupMessages.exit); // если нажали кнопку выхода из сцены
                return ctx.scene.leave();
            }

            const tableName = 'GamerList' + ctx.session.typeGame;
            Table = sequelize.models[tableName];
            const gamer = await Table.findOne({ where: { id_tg: ctx.from.id, game_id: ctx.session.game_id } });
            if (gamer) {
                await ctx.editMessageText(signupMessages.alreadySignedup); // если уже записаны то выходим из сцены
                return ctx.scene.leave();
            }

            await ctx.editMessageText('Выбери: ', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Ввести промокод', callback_data: 'promocode' }],
                        [{ text: 'Перейти к оплате', callback_data: 'no_promocode' }],
                        [{ text: 'Вернуться в главное меню', callback_data: '0' }]
                    ],
                    one_time_keyboard: true
                },
            })
            return ctx.wizard.next();

        });

        step5.on('callback_query', async (ctx) => {
            const chosenAction = ctx.callbackQuery.data;
            switch (chosenAction) {
                case 'promocode':
                    await ctx.editMessageText('Введи промокод')
                    return ctx.wizard.next();

                case 'no_promocode':
                    return ctx.scene.enter('paymentScene');

                case '0':
                    await ctx.editMessageText(signupMessages.exit); // если нажали кнопку выхода из сцены
                    return ctx.scene.leave();
            }
        });

        step6.on('text', async (ctx) => {
            const promocode = ctx.message.text;
            const promo = await Promocode.findOne({ where: { promocode: promocode } });

            if (promo) {
                const old_price = ctx.session.price;
                if (promo.type_promocode === 0) {
                    ctx.session.price -= old_price * promo.discount / 100;
                } else {
                    ctx.session.price -= promo.discount;
                }
                ctx.session.promocode = promo.promocode
                await ctx.reply(`Ты активировал промокод ${promo.promocode} ${promo.discount}\nЦена: ${old_price}\nЦена со скидкой: ${ctx.session.price}`);

            } else {
                await ctx.reply('Такого промокода нет', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Вернутся к выбору способа оплаты', callback_data: ctx.wizard.state.choice }],
                        ],
                        one_time_keyboard: true
                    },
                });
                return ctx.wizard.selectStep(3)
            }
            return ctx.scene.enter('paymentScene');
        });

        const signup = new Scenes.WizardScene('signupScene', step1, step2, step3, step4, step5, step6)
        return signup;
    }

}


module.exports = SceneGenerator;