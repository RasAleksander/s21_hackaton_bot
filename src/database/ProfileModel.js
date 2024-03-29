const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');

const Profile = sequelize.define('Profile', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    id_tg: {
        type: DataTypes.BIGINT.UNSIGNED,
        unique: true,
        allowNull: false
    },
    nickname: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Новосибирск'
    },
    tg_username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    limit: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    warning_count: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: false
    }
});

module.exports = Profile;