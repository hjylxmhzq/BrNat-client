import { TCPProxyClient } from "./frpClient";
import { ipcMain } from 'electron';

const command = {
  CONNECT: 'CONNECT',
  GET_STATUS: 'GET_STATUS',
  CLOSE: 'CLOSE',
}

interface IBind {
  host: string;
  port: number;
  label: string;
}

let client: TCPProxyClient = null;

ipcMain.on(command.CONNECT, (event, arg) => {
  console.log(arg)
  let token: string, binds: IBind[], bindPort: number, bindAddr: string;
  ({ token, binds, bindPort, bindAddr } = arg);
  const bindsObj = {};
  for (let bind of binds) {
    bindsObj[bind.label] = {
      port: bind.port,
      host: bind.host,
      remotePort: -1,
    }
  }
  let config = {
    bindPort: bindPort || 9999,
    bindAddr: bindAddr || '127.0.0.1',
    appName: 'test',
    restartDelay: 1000,
    binds: bindsObj,
    token: token,
  }

  client = new TCPProxyClient(config)

  client.connect();
})

ipcMain.on(command.GET_STATUS, (event, arg) => {
  const status = client && client.getStatus();
  event.reply(command.GET_STATUS, status);
})

ipcMain.on(command.CLOSE, (event, arg) => {
  client && client.close();
})


