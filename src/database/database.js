const Sequelize = require('sequelize');

// Подключение к основной БД
// Пароль и логин лучше обезопасить через env
const sequelize = new Sequelize('S21_hackathon', 'root', '$sudo', {
    host: 'localhost',
    dialect: 'mysql',
});

module.exports = sequelize;