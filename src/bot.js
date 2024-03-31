// Библиотеки
const { Telegraf, session, Stage, Scenes, Markup } = require('telegraf');
require('dotenv').config()
const cron = require('node-cron');
const moment = require('moment');


const bot = new Telegraf(process.env.BOT_TOKEN);

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
const bookingsScene = createScene.bookingsScene()
const adminScene = createScene.adminScene()
const newSpaceScene = createScene.newSpaceScene()
const blockSpaceScene = createScene.blockSpaceScene()
const addAdminScene = createScene.addAdminScene()
const stage = new Scenes.Stage([startScene, nicknameScene, signupScene, bookingsScene, adminScene, newSpaceScene, blockSpaceScene, addAdminScene])


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

bot.command('bookings', async (ctx) => {
    ctx.scene.enter(`bookingsScene`)
})

bot.command('admin', async (ctx) => {
    if (await helperFunction.doesAdminExist(ctx.from.id)) {
        ctx.scene.enter(`adminScene`)
    }
    else {
        ctx.reply('Вы не администратор')
    }
})

// bot.command('run', async (ctx) => {
//     await helperFunction.runScript();
// await helperFunction.updateStatusAndAddToLimit();
// })

bot.launch()

// Запуск cron-задачи в 00, 15, 30 и 45 минут каждого часа
cron.schedule('15,30,45,00 * * * *', async () => {
    const currentTime = moment();
    if ([0, 15, 30, 45].includes(currentTime.minute())) {
        // В этом моменте времени нужно выполнить задачу
        await helperFunction.runScript();
        await helperFunction.updateStatusAndAddToLimit();
        console.log('Предупреждения разосланы');
    }
});


module.exports = bot;