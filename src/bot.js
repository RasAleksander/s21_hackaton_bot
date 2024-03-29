// Библиотеки
const { Telegraf, session, Stage, Scenes, Markup } = require('telegraf');
require('dotenv').config()
const bot = new Telegraf(process.env.BOT_TOKEN, { polling: true });

// База данных и таблицы
const sequelize = require('./database/database'); // Настройки модели БД

// (async () => {
//     await sequelize.sync({ alter: true });
// })();

// Файлы
const helperFunction = require('./functions/helperFunc');


// Сцены
const SceneGenerator = require('./scenes/Scenes.js')
const createScene = new SceneGenerator()

const startScene = createScene.startScene()
const nicknameScene = createScene.nicknameScene()
const signupScene = createScene.signupScene()
const stage = new Scenes.Stage([startScene, nicknameScene, signupScene])


// Команды без диалога
const { voteMessage } = require('./messages/Messages.js');
const { help } = require('forever/lib/forever/cli.js');

bot.use(session());
bot.use(stage.middleware())
bot.use(Telegraf.log())

// Команды для пользователей
bot.command('start', async (ctx) => {
    const match = ctx.message.text.split(' ');
    if (match && match[1]) {
        const roomName = match[1];
        helperFunction.checkQR(ctx, roomName);
    } else {
        ctx.scene.enter('startScene');
    }
})

bot.command('signup', async (ctx) => {
    ctx.scene.enter(`signupScene`)
})

bot.command('calendar', async (ctx) => {
    calendar.startNavCalendar(ctx.message);
})

bot.on("callback_query", (ctx) => {
    if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
        res = calendar.clickButtonCalendar(ctx.callbackQuery);
        if (res !== -1) {
            bot.telegram.sendMessage(ctx.callbackQuery.message.chat.id, "You selected: " + res);
        }
    }
});




bot.launch()


module.exports = bot;