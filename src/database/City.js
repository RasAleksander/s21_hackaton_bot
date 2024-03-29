const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');

const City = sequelize.define('City', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        defaultValue: 'Новосибирск',
        allowNull: false
    }
});

module.exports = City;