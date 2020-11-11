import * as net from 'net';

interface ILocalBind {
    port: number;
    host: string;
    remotePort: number;
}

interface ILocalBinds {
    [label: string]: ILocalBind;
}

interface IProxyConfig {
    bindPort: number;
    bindAddr: string;
    appName: string;
    restartDelay: number; // ms
    binds: ILocalBinds;
    token: string;
}

interface IControlData {
    action: string;
}

enum Action {
    LINK_REGIST = 'LINK_REGIST',
    LINK_REGIST_RESPONSE = 'LINK_REGIST_RESPONSE',
    ADD_BIND = 'ADD_BIND',
    DATA_SOCKET = 'DATA_SOCKET',
    TUNNEL_CONNECT = 'TUNNEL_CONNECT',
    ERR_TOKEN = 'ERR_TOKEN'
}

interface ILinkCommand {
    link: () => string;
    regist: (label: string) => string;
    connect: (label: string, remoteClientSymbol: string) => string;
}

interface ILinkBinds {
    [label: string]: {
        proxySockets: {
            [remoteHost_remotePort: string]: {
                localSocket: net.Socket,
                tunnelSocket: net.Socket,
            }
        }
    }
}
// 区分每个socket命令的标志符
const END_OF_COMMAND = "END_OF_COMMAND";
//用于建立和绑定双向TCP连接
export class TCPProxyClient {
    private linkSocket: net.Socket;
    private command: ILinkCommand;
    private config: IProxyConfig;
    private linkBinds: ILinkBinds = {};
    private linkRestartTimer: any;
    private commandCache: string = '';
    private linkConnected: boolean = false;
    private errInfos: string[] = [];

    constructor(config: IProxyConfig) {
        this.config = config;
        this.command = {
            link: () => JSON.stringify({ token: this.config.token, action: Action.LINK_REGIST }) + END_OF_COMMAND,
            regist: (label: string) => this.controlDataFac(Action.ADD_BIND, label, this.config.token, this.config.binds[label]),
            connect: (label: string, remoteClientSymbol: string) => this.controlDataFac(Action.TUNNEL_CONNECT, label, this.config.token, this.config.binds[label], { clientSymbol: remoteClientSymbol })
        }
    }

    private controlDataFac(action: string, label: string, token: string, bind: ILocalBind, rest: object = {}) {
        return JSON.stringify({ action, label, token, bind, ...rest }) + END_OF_COMMAND;
    }

    private parseCommand(chunk: Buffer) {
        this.commandCache += chunk.toString();
        if (!this.commandCache.endsWith(END_OF_COMMAND)) {
            return null;
        }
        try {
            const cmList = chunk.toString().split(END_OF_COMMAND).filter(cmstr => !!cmstr).map(cmstr => JSON.parse(cmstr));
            this.commandCache = '';
            return cmList;
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    private linkStart() {
        try {
            this.linkSocket = net.createConnection({
                port: this.config.bindPort,
                host: this.config.bindAddr,
            });
            console.log(`----- connecting to ${this.config.bindAddr}:${this.config.bindPort} -------`)
            this.linkSocket.setTimeout(5000);
            this.linkSocket.write(this.command.link());
            this.linkSocket.on('data', this.linkSocketDataHandler.bind(this));
        } catch (e) {
            this.linkSocket = null;
            console.error(e.message);
        }
    }

    private registBind() {
        Object.keys(this.config.binds).forEach(label => {
            console.log(`regist: ${label}`);
            this.linkSocket.write(this.command.regist(label));
        });
    }

    private linkSocketDataHandler(chunk: Buffer) {
        try {
            this.linkConnected = true;
            const cmList = this.parseCommand(chunk);
            while (cmList && cmList.length) {
                const cm = cmList.shift();
                if (cm.action === Action.DATA_SOCKET) {
                    const label = cm.label;
                    const remoteClientSymbol = cm.clientSymbol;
                    if (!this.config.binds[label]) {
                        console.error(`label ${label} not exist`);
                        return;
                    }
                    // 开始建立链接
                    const localSocket = this.startLocalConnect(label, this.config.binds[label], remoteClientSymbol);
                    const tunnelSocket = this.startTunnelConnect(label, this.config.binds[label], remoteClientSymbol);
                    // tunnelSocket.on('data', chunk => {
                    //     localSocket.write(chunk);
                    // });
                    // localSocket.on('data', chunk => {
                    //     tunnelSocket.write(chunk);
                    // })
                    localSocket.pipe(tunnelSocket);
                    tunnelSocket.pipe(localSocket);
                    tunnelSocket.on('end', () => {
                        localSocket.end();
                        console.log('tunnel connection end');
                    });
                    localSocket.on('end', () => {
                        console.log('tunnel connection end');
                    });
                    tunnelSocket.on('error', err => {
                        console.error(err.message);
                    });
                    localSocket.on('error', err => {
                        console.error(err.message);
                    });
                } else if (cm.action === Action.ADD_BIND && cm.remotePort) {
                    this.config.binds[cm.label].remotePort = cm.remotePort;
                } else if (cm.action === Action.ERR_TOKEN) {
                    this.errInfos.push('连接错误, 请检查Token是否正确');
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private startLocalConnect(label: string, bind: ILocalBind, remoteClientSymbol: string) {
        console.log('start local connection');
        if (this.linkBinds[label]) {
            if (!this.linkBinds[label].proxySockets[remoteClientSymbol]) {
                this.linkBinds[label].proxySockets[remoteClientSymbol] = { localSocket: null, tunnelSocket: null };
            }
            this.linkBinds[label].proxySockets[remoteClientSymbol].localSocket
                && this.linkBinds[label].proxySockets[remoteClientSymbol].localSocket.end()
            this.linkBinds[label].proxySockets[remoteClientSymbol].localSocket = net.createConnection({
                port: bind.port,
                host: bind.host,
                allowHalfOpen: true,
            });
        } else {
            this.linkBinds[label] = {
                proxySockets: {
                    [remoteClientSymbol]: {
                        localSocket: net.createConnection({
                            port: bind.port,
                            host: bind.host,
                            allowHalfOpen: true,
                        }),
                        tunnelSocket: null,
                    }
                }
            }
        }
        return this.linkBinds[label].proxySockets[remoteClientSymbol].localSocket;
    }
    private startTunnelConnect(label: string, bind: ILocalBind, remoteClientSymbol: string /* 外部访问的客户端的标识，用于多线程的情况 */) {
        console.log('start tunnel connection');
        if (this.linkBinds[label]) {
            if (!this.linkBinds[label].proxySockets[remoteClientSymbol]) {
                this.linkBinds[label].proxySockets[remoteClientSymbol] = { localSocket: null, tunnelSocket: null };
            }
            this.linkBinds[label].proxySockets[remoteClientSymbol].tunnelSocket
                && this.linkBinds[label].proxySockets[remoteClientSymbol].tunnelSocket.end();
            this.linkBinds[label].proxySockets[remoteClientSymbol].tunnelSocket = net.createConnection({
                port: this.config.bindPort,
                host: this.config.bindAddr,
                allowHalfOpen: true,
            });
        } else {
            this.linkBinds[label] = {
                proxySockets: {
                    [remoteClientSymbol]: {
                        localSocket: net.createConnection({
                            port: this.config.bindPort,
                            host: this.config.bindAddr,
                            allowHalfOpen: true,
                        }),
                        tunnelSocket: null,
                    }
                }
            }
        }
        this.linkBinds[label].proxySockets[remoteClientSymbol].tunnelSocket.write(this.command.connect(label, remoteClientSymbol));
        return this.linkBinds[label].proxySockets[remoteClientSymbol].tunnelSocket;
    }

    getStatus() {
        const err = this.errInfos;
        this.errInfos = [];
        if (!this.linkConnected) {
            Object.keys(this.config.binds).forEach(label => {
                this.config.binds[label].remotePort = -1;
            })
        }
        return {
            err,
            isOnline: this.linkConnected,
            binds: this.config.binds
        }
    }

    close() {
        console.log('-------- client close by user ---------');
        this.linkSocket && this.linkSocket.removeAllListeners();
        global.clearTimeout(this.linkRestartTimer);
        this.linkSocket && this.linkSocket.end();
        this.linkSocket && this.linkSocket.destroy();
        this.linkSocket = null;
        this.linkConnected = false;
    }

    connect(autoRestart: boolean = true) {
        this.errInfos = [];
        this.linkStart();
        this.registBind();
        if (autoRestart) {
            this.linkSocket.on('close', () => {
                this.linkSocket = null;
                this.linkConnected = false;
                console.log('link disconnect');
                global.clearTimeout(this.linkRestartTimer);
                this.linkRestartTimer = global.setTimeout(() => {
                    console.log('ready for restart');
                    this.connect(autoRestart);
                }, this.config.restartDelay);
            });
            this.linkSocket.on('error', (err) => {
                this.linkSocket = null;
                this.linkConnected = false;
                console.error('link connect err: ', err.message);
                global.clearTimeout(this.linkRestartTimer);
                this.linkRestartTimer = global.setTimeout(() => {
                    console.log('ready for restart');
                    this.connect(autoRestart);
                }, this.config.restartDelay);
            });
        }
    }
}
