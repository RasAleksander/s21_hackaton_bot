const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./database');

// status: 1 - забронировано, 2 - успешно подтверждено, 3 - отменено, 4 - заблокировано

const VisitLog = sequelize.define('VisitLog', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
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
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: false
    }
});

module.exports = VisitLog;
