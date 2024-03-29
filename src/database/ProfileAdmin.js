const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');

const ProfileAdmin = sequelize.define('ProfileAdmin', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    peer_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        unique: true,
        allowNull: false,
        references: {
            model: require('./ProfilePeer'),
            key: 'id'
        }
    },
    access: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
    }
});

module.exports = ProfileAdmin;