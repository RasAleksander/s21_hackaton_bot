const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');

const TokenPeer = sequelize.define('TokenPeer', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    nickname: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    token: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    verify: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    }
});

module.exports = TokenPeer;