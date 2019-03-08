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

let rootWindow: BrowserWindow | null;

export function init() {
    if (app.isReady()) return
    app.requestSingleInstanceLock()

    app.on('ready', (launchInfo) => {
        createWindow()
    })

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (rootWindow === null) {
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
    rootWindow = new BrowserWindow(WINDOW_DEFAULT_OPTIONS)
    rootWindow.loadFile('./index.html')
    rootWindow.show()
    if (rootWindow) {
        rootWindow.once('focus', () => { if (rootWindow) rootWindow.flashFrame(false) })
        rootWindow.flashFrame(true)
        rootWindow.setSkipTaskbar(false)
        app.focus()
    }
    rootWindow.on('closed', () => {
        rootWindow = null
    })
}