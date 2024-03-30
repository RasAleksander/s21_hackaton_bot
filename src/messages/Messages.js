
const greetingSignedupPeer = {
    greetingOldPeer: 'Приветсвую тебя пир, чем я могу тебе помочь?',
    exception: 'Прости пир, но такого я не умею, выбери что-нибудь из списка ниже.'
};


const greetingUnsignedPeer = {
    greetingNewPeer: 'Приветсвую тебя новый пир! Предлагаю тебе заргеистрироваться, чтобы продолжить наше общение.',
    exception: 'Чтобы начать пользоваться ботом, нужно зарегистрироваться!'
};

const nicknameMessages = {
    newPeer: 'Сначала нужно представиться. Мне нужен твой никнейм на платформе',
    wrongNickname: 'Некоректный никнейм! Попробуй еще раз',
    correctNickname: 'Прекрасно, рад нашему знакомству!'
};

const signupMessages = {
    signupMailMessage: 'Пожалуйста введите адрес электронной почты!',
    signupNicknameMessage: 'Пожалуйста введите свой никнейм!',
    peerAlreadyExists: 'Такой пользователь уже зарегистрирован!'
};


const dialoguesMessages = {
    actions: [
        '1-Посмотреть забронированные переговорки',
        '2-Забронировать переговорку',
        '3-Отменить свою бронь на переговорку',
        '4-Ознакомиться с правилами бронирования переговорки'
    ],
    chooseAction: 'Выберите вариант:',
    chooseMeetingRoom: 'Выберите переговорку:',
    chooseDate: 'Выберите дату:',
    chooseTime: 'Выберите время:',
    successfulBooking: 'Переговорка успешно забронирована!',
    confirmCancel: 'Точно ли хотите отменить бронь? (Да/Нет)',
    cancelSuccess: 'Бронь успешно отменена!',
    //cancelDenied: 'Отмена брони отменена.',
    showRules: 'Вот правила бронирования и использования переговорки:',
    rulesList: [
        '1) Переговорки можно бронировать не более чем на 1 час.'
        // Здесь должны быть все правила
    ]
};


const extensionBooking = {
    beforeStart: 'У вас стоит бронь на переговорку!',
    bookingBegin: 'Бронь началась, пожалуйста отсканируйте QR код, для подтверждения!',
    canExtendBooking: 'У вас заканчивается бронь на переговорку, но есть свободный слот после, хотите продлить вашу бронь?',
    timeForExtension: 'Пожалуйста выберите время для продления брони:',
    slotExtended: 'Бронь успешно продлена.',
    beforeEnd: 'У вас заканчивается бронь на переговорку! По истечению времени, пожалуйста, покиньте переговорку!',
};


module.exports = {
    greetingSignedupPeer,
    greetingUnsignedPeer,
    nicknameMessages,
    signupMessages,
    dialoguesMessages,
    extensionBooking
}