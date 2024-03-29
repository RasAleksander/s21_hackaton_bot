const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');

const VisitLog = sequelize.define('VisitLog', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        allowNull: false
    },
    meeting_room_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: require('./MeetingRoom'),
            key: 'id'
        }
    },
    peer_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: require('./ProfilePeer'),
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATA,
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    }
});

module.exports = VisitLog;