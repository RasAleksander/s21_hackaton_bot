const nodemailer = require('nodemailer');
const crypto = require('crypto');

const TokenPeer = require('../database/TokenPeer');

require('dotenv').config()

async function sendEmail(nickname) {
    const email = nickname + '@student.21-school.ru'
    const token = crypto.randomBytes(20).toString('hex')
    await TokenPeer.create({ nickname, token });

    let transporter = nodemailer.createTransport({
        service: process.env.SE_SERVICE,
        auth: {
            user: process.env.SE_EMAIL,
            pass: process.env.SE_PASS
        },
        tls: {
            servername: 'smtp.gmail.com',
            rejectUnauthorized: false
        }
    });

    let mailOptions = {
        from: process.env.SE_EMAIL,
        to: email,
        subject: 'Подтверждение регистрации',
        text: `Для завершения регистрации нашего сервиса перейдите по ссылке:
        http://${process.env.SE_HOST}:${process.env.SE_PORT}/verify?token=${token}&nickname=${encodeURIComponent(nickname)}`
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Ошибка отправки письма:', error);
    }
}

async function checkToken(nickname, token) {
    try {
        const user = await TokenPeer.findOne({ where: { nickname, token } }); // Поиск пользователя по никнейму и токену
        return !!user; // Возвращаем true, если пользователь найден, иначе false
    } catch (error) {
        console.error('Ошибка при проверке токена:', error);
        throw new Error('Ошибка при проверке токена');
    }
}


module.exports = {
    sendEmail,
    checkToken
}