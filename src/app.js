const express = require('express');
const sendEmailsFunc = require('./functions/sendEmailsFunc');
const TokenPeer = require('./database/TokenPeer');

const app = express();

require('dotenv').config()

app.get('/verify', async (req, res) => {
  const { nickname, token } = req.query; // Получаем никнейм и токен из URL-адреса
  if (!nickname || !token) {
    return res.status(400).send('Недостаточно данных для верификации');
  }

  try {
    const isValidToken = await sendEmailsFunc.checkToken(nickname, token);
    if (isValidToken) {
      await TokenPeer.update({ verify: 1 }, { where: { nickname, token } });
      return res.send('Верификация прошла успешно');
    } else {
      return res.status(401).send('Неверный токен');
    }
  } catch (error) {
    console.error('Ошибка при верификации:', error);
    return res.status(500).send('Внутренняя ошибка сервера');
  }
});

app.listen(process.env.SE_PORT, () => {
  console.log(`Сервер запущен на порту ${process.env.SE_PORT}`);
});