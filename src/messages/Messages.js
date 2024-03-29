
const startMessages = {
    old_gamer: 'Кого я вижу! Чем могу тебе помочь?',
    new_gamer: 'Привет, а я тебя не знаю'
};

const nicknameMessages = {
    old_gamer: 'Нипиши свое новое прозвище',
    new_gamer: 'Но сначала представься. Мне нужен твой никнейм на платформе',
    wrong_nickname: 'Некоректный никнейм! Попробуй еще раз',
    good_nickname: 'Это ты здорово придумал, так и буду тебя называть',
    info_for_new: 'Хорошо приятель, тогда вот тебе список того, что я могу тебе провернуть:'
};

const signupMessages = {
    notUser: 'Упс, сначала нужно зарегистрироваться!',
    whichType: `Что ты выберешь сегодня, `,
    listGames: 'Смотри, какие события нас ждут:',
    noGames: 'Прости, пока на улицах всё тихо. Я сообщу тебе, когда узнаю о ближайшей игре',
    posterText: 'Ну как, ты в деле? ',
    exit: 'Ты покинул запись на игру',
    youSignedup: 'Ты записан в переговорку!',
    alreadySignedup: 'Ты уже записан!',
}


module.exports = {
    startMessages,
    nicknameMessages,
    signupMessages
}