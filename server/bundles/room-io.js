class RoomIO {
    constructor(socket) {
        this.socket = socket;
        this.room = [];
    }

    name() {
        return this.room[this.socket.id] || null;
    }

    join(room) {
        if (typeof room === "object") {
            this.room[this.socket.id] = room;
        } else {
            if (this.room[this.socket.id]) {
                if (!this.room[this.socket.id].includes(room)) {
                    this.room[this.socket.id].push(room)
                }
            } else {
                this.room[this.socket.id] = [room];
            }
        }
        this.leave();
        this.socket.join(this.room[this.socket.id]);
    }

    leave() {
        this.socket.leave(this.room[this.socket.id]);
    }
}

module.exports = RoomIO;
