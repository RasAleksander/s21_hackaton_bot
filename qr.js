// const fs = require('fs');
// const QRCode = require('qrcode');
// const botToken = "5927864594:AAFFKojRwP1UHZ4NHoNr1UhWTQnHjiOQzJ0";
// // Текст или данные, которые нужно закодировать в QR-коде
// const data = `https://api.telegram.org/bot${botToken}`;

// // Опции для настройки внешнего вида QR-кода (необязательно)
// const options = {
//   width: 256,  // ширина изображения QR-кода
//   height: 256, // высота изображения QR-кода
//   color: {     // цвет QR-кода
//     dark: '#000000', // тёмный цвет
//     light: '#ffffff' // светлый цвет
//   },
//   margin: 1, // отступ вокруг QR-кода
//   errorCorrectionLevel: 'H' // уровень коррекции ошибок ('L', 'M', 'Q', 'H')
// };

// // Генерируем QR-код
// QRCode.toFile('qrcode.png', data, options, (err) => {
//   if (err) throw err;
//   console.log('QR-код успешно сгенерирован и сохранен в файле qrcode.png');
// });



const qrcode = require('qrcode');
const fs = require('fs');

// Замените "ВашТокен" на токен вашего бота
const botToken = "7126341483:AAFAnVnsq5l9qlNVR-OL7TNueBNE18cFjrg";
// Замените "ВашЧатID" на ID чата с вашим ботом
const chatId = "lavondas_hackathon_bot";
// Замените "ВашТекст" на текст сообщения, которое вы хотите отправить
const message = '';

// Формируем URL-ссылку для отправки сообщения боту
const url = `https://t.me/lavondas_hackathon_bot?start=lavondas_room`;

// Создаем QR-код на основе URL-ссылки
qrcode.toFile('qrcode.png', url, (err) => {
  if (err) throw err;
  console.log('QR-код успешно сгенерирован и сохранен в файле qrcode.png');
});
