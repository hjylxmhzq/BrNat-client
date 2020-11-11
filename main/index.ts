import { app, BrowserWindow, Menu, MenuItem } from "electron";
import * as path from "path";
import './ipcMain';

let win: BrowserWindow;

function createWindow() {
  // 创建浏览器窗口
  win = new BrowserWindow({
    useContentSize: true,
    // titleBarStyle: 'hidden',
    // frame: false,
    width: 620,
    height: 380,
    maxHeight: 500,
    minHeight: 300,
    maxWidth: 820,
    minWidth: 620,
    webPreferences: { webSecurity: false, nodeIntegration: true, enableRemoteModule: true }
  });
  // const ses = win.webContents.session;
  // process.env.NODE_ENV.includes('dev') && ses.loadExtension(path.resolve(__dirname, '..', 'packages/redux-devtools-extension'));
  //然后加载app的index.html
  let indexPath = path.resolve(__dirname, "../renderer-dist", "index.html");
  if (process.env.NODE_ENV && process.env.NODE_ENV.includes('dev')) {
    win.loadURL('http://localhost:8080/renderer-dist');
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexPath);
  }
  Menu.setApplicationMenu(null);
  // createMenu();
  // win.webContents.openDevTools();

  // 当 window 被关闭，这个事件会被触发。
  win.on("closed", () => {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    win = null;
  });
}

function createMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startspeaking' },
              { role: 'stopspeaking' }
            ]
          }
        ] : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
            { role: 'close' }
          ])
      ]
    },
    {
      label: 'Dev',
      submenu: [
        {
          label: 'DevTools',
          click: async () => {
            win.webContents.openDevTools();
          },
          accelerator: 'CmdOrCtrl+Shift+P', // 用cmd/ctrl+shift+p打开开发者工具
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

app.on("ready", createWindow);

// 当全部窗口关闭时退出。
app.on("window-all-closed", () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== "darwin") {
    app.quit();
  }
});
