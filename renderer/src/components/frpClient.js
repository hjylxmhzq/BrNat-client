const { ipcRenderer } = window.require('electron')
const event = require('events');


const ev = new event.EventEmitter();

const command = {
  CONNECT: 'CONNECT',
  GET_STATUS: 'GET_STATUS',
  CLOSE: 'CLOSE',
}

class ProxyController {
  constructor() {
    ipcRenderer.on(command.CONNECT, (e, arg) => {
      console.log(arg);
    })
    ipcRenderer.on(command.GET_STATUS, (e, arg) => {
      ev.emit(command.GET_STATUS, arg);
    })
  }
  connect(token, binds, bindAddr = '127.0.0.1', bindPort = 9998) {
    // binds: [{ host, port, label }]
    ipcRenderer.send(command.CONNECT, {
      token, binds, bindPort, bindAddr
    });
  }
  close() {
    ipcRenderer.send(command.CLOSE, 'close');
  }
  refreshStatus() {
    ipcRenderer.send(command.GET_STATUS, 'GET_STATUS');
  }
  listenStatus(cb) {
    ev.on(command.GET_STATUS, cb);
  }
  removeStatusListener(cb) {
    ev.off(command.GET_STATUS, cb);
  }
}

const frpController = new ProxyController();
setInterval(async () => {
  frpController.refreshStatus();
}, 1000);

export { frpController }