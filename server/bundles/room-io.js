const logger = require('./logger');

class RoomIO {
    constructor(socket) {
        this.socket = socket;
        this.room = [];
    }

    name() {
        return this.room[this.socket.id] || null;
    }

    join(room) {
        logger.info('JOIN TO ROOM: %s', room);
        this.leave();
        this.room[this.socket.id] = room;

        this.socket.join(room);
    }

    leave() {
        this.socket.leave(this.room[this.socket.id]);
    }
}

module.exports = RoomIO;