const RoomIO = require('./room-io');
const AccessIO = require('./access-io');
const logger = require('./logger');

class RedisIO {
  constructor(nsp, io, sub, pub, channels) {
    this.nsp = nsp;
    this.io = io;
    this.sub = sub;
    this.pub = pub;
    this.channels = channels;
  }

  /**
   * Get event from data
   * @param data
   */
  parseEvent(data) {
    return Object.assign({name: '', data: {}}, JSON.parse(data));
  };

  /**
   * Init all events on '*'
   * @param socket
   * @return {*}
   */
  wildcard(socket) {
    let Emitter = require('events').EventEmitter;
    let emit = Emitter.prototype.emit;
    let onevent = socket.onevent;
    socket.onevent = function (packet) {
      let args = packet.data || [];
      onevent.call(this, packet);    // original call
      emit.apply(this, ["*"].concat(args));      // additional call to catch-all
    };
    return socket;
  };

  getIoNsp(channel) {
    return channel.replace(this.nsp, '');
  }

  /**
   * on connection
   * @param channel
   * @param data
   */
  on(channel, data) {
    logger.info('SocketIO > Listening');

    let nsp = this.getIoNsp(channel);

    // logger.info('SocketIO > Connection on nsp: %s', nsp);

    let nspio = this.io.of('/' + nsp);
    nspio.on('connection', (socket) => {
      socket.roomIO = new RoomIO(socket);
      socket.access = new AccessIO(socket);

      socket = this.wildcard(socket);

      // logger.info('SocketIO > Connected socket: %s, nsp: %s, room: %s', socket.id, nsp, socket.roomIO.name());

      socket.on('disconnect', () => {
        this.pub.publish(channel + '.io', JSON.stringify({
          name: 'disconnect',
          data: ['disconnect'],
          id: socket.id
        }));
        // logger.info('SocketIO > Disconnected socket: %s, nsp: %s, room: %s', socket.id, nsp, socket.roomIO.name());
      });

      socket.on('*', (name, data) => {
        data = data || {};
        logger.info('+');
        // if (false === socket.access.can(name)) {
        if (false) {
          logger.info('SocketIO > On failed socket');
          // logger.info('SocketIO > On failed socket: %s, nsp: %s, room: %s, name: %s, data: %s', socket.id, nsp, socket.roomIO.name(), name, JSON.stringify(data));
        } else {
          // logger.info('SocketIO > On success socket: %s, nsp: %s, room: %s, name: %s, data: %s', socket.id, nsp, socket.roomIO.name(), name, JSON.stringify(data));
          switch (name) {
            case 'join' :
              socket.roomIO.join(data.room);
              break;
            case 'leave':
              socket.roomIO.leave();
              break;
            default:
              data.room = socket.roomIO.name();
              this.pub.publish(channel + '.io', JSON.stringify({
                name: name,
                data: data,
                id: socket.id
              }));
          }
        }
      });
    });
  };

  /**
   * Emit event to exist connection
   * @param channel
   * @param data
   */
  emit(channel, data) {
    let event = this.parseEvent(data),
      room = event.data.room,
      id = event.data.id,
      nsp = this.getIoNsp(channel);

    // logger.info('SocketIO > Emit ' + JSON.stringify(event.name) + ' ' + JSON.stringify(event.data));
    if (room) {
      delete event.data.room;
      this.io.of('/' + nsp).to(room).emit(event.name, event.data);
    } else {
      if (id && id in this.io.sockets.connected) {
        delete event.data.id;
        this.io.sockets.connected[id].emit(event.name, event.data);
      } else if (!id) {
        this.io.of('/' + nsp).emit(event.name, event.data);
      }
    }
  };

  /**
   * List redis/socket.io
   */
  listen() {
    for (let i = 0; i < this.channels.length; i++) {
      this.sub.subscribe(this.channels[i]);
      this.on(this.channels[i], JSON.stringify({}));
    }

    this.sub.on("message", (channel, data) => {
      this.emit(channel, data);
    });
  }

}

module.exports = RedisIO;
