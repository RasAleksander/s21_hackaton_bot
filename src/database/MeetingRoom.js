const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');

const MeetingRoom = sequelize.define('MeetingRoom', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }, 
    floor: { 
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    }
});

module.exports = MeetingRoom;