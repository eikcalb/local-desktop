import { app, BrowserWindow, BrowserWindowConstructorOptions } from "electron";


const WINDOW_DEFAULT_OPTIONS: BrowserWindowConstructorOptions = {
    center: true,
    skipTaskbar: true,
    frame: false,
    transparent: true,
    fullscreen: false,
    show: false,
    webPreferences: {
        nodeIntegration: true
    }
}

let _rootWindow: BrowserWindow | null;
export declare var rootWindow: BrowserWindow
Object.defineProperty(module.exports, 'rootWindow', {
    get() {
        return _rootWindow
    }
})

export function init() {
    if (app.isReady()) return
    app.requestSingleInstanceLock()

    app.on('ready', (launchInfo) => {
        createWindow()
    })

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (_rootWindow === null) {
            createWindow()
        }
    })

    app.on('will-quit', () => {
        if (!app.hasSingleInstanceLock) return
        app.releaseSingleInstanceLock()
    })

    app.on('window-all-closed', () => {
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })


}

function createWindow() {
    _rootWindow = new BrowserWindow(WINDOW_DEFAULT_OPTIONS)
    _rootWindow.loadFile('./index.html')
    _rootWindow.show()
    if (_rootWindow) {
        _rootWindow.once('focus', () => { if (_rootWindow) _rootWindow.flashFrame(false) })
        _rootWindow.flashFrame(true)
        _rootWindow.setSkipTaskbar(false)
        app.focus()
    }
    _rootWindow.on('closed', () => {
        _rootWindow = null
    })
}