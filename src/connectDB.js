require('dotenv').config();
const { Client } = require('mysql');

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Подключение к базе данных
client.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Connection error', err));