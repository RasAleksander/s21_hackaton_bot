const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');


const ProfilePeer = sequelize.define('ProfilePeer', {
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
    city_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: require('./City'),
            key: 'id'
        }
    },
    tg_peername: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    limit: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 60
    },
    warning_count: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
    }
});

module.exports = ProfilePeer;