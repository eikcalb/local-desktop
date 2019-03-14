import Auth, { ADMIN_SALT_1_PATH, ADMIN_SALT_2_PATH } from "./auth";
import { Stats } from "fs";
let fs = window.require('fs')
const path = window.require('path')
const { remote } = window.require('electron')
export const appPath = path.join(remote.app.getPath('userData'), '.app')

export default function start(password: string) {
    log("Starting Machine...", Log.STARTUP)

    if (isFirstRun()) {
        return setup(password)
    }
    return
}

/**
 * Checks if this is first run of application. Usually indicated by the '.app' directory in user home
 */
export function isFirstRun(): boolean {
    try {
        let stat = fs.statSync(appPath)
        console.log(appPath, stat)
        return false // if the code execution continues then this is not first run, because app directory exists
    } catch (e) {
        console.error(e)
        return true // if error is thrown, the path does not exist
    }
}

function setupAppDir(callback: (err?: any) => any): void {
    fs.stat(appPath, (err: Error, stats: Stats) => {
        if (stats && !err) callback()
        else fs.mkdir(appPath, { mode: 0o777, recursive: true }, callback)
    })
}

function setup(password: string): Promise<unknown> {
    return new Promise((res, rej) => {
        setupAppDir((err: any) => {
            if (err) {
                throw err
            }
            Auth.generateKeyPair('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase: password
                }
            }).then(keyPair => {
                fs.writeFile(path.join(appPath, '.v1.pubkey'), keyPair.publicKey, (err: any) => {
                    if (err) {
                        throw err
                    }
                    fs.writeFile(path.join(appPath, '.v1.privkey'), keyPair.privateKey, { mode: 0o600 }, (err: any) => {
                        if (err) {
                            fs.unlinkSync(path.join(appPath, '.v1.pubkey'))
                            throw err
                        }
                        return res()
                    })
                })
            })
        })
    })

}

export function initialize(root: HTMLElement): void {
    // addEventListener('DOMContentLoaded', e => {
    const window = remote.getCurrentWindow()
    let size = 'Restore'
    window.on('maximize', () => {
        size = 'Maximize'
        root.className = size
    })
        .on('restore', () => {
            size = 'Restore'
            root.className = size
        })
        .on('enter-full-screen', () => {
            size = 'Fullscreen'
            root.className = size
        })
    if (!root.classList.contains('Restore') && root.classList.contains('Maximize')) {
        root.classList.replace('Maximize', 'Restore')
    }
    // })
}

export enum Log {
    STARTUP, SHUTDOWN, MESSAGE, ERROR
}
export function log(message: string, type: Log = Log.MESSAGE) {
    let log = `${new Date().toLocaleString()}: ${message}\r\n`
    fs.appendFile(path.join(appPath, 'log.dat'),
        log,
        (e: any) => {
            console.log(log, e ? e : `${message} successfully logged`)
        })
}

export function rollBack() {
    if (isFirstRun()) return
    fs.unlinkSync(ADMIN_SALT_1_PATH)
    fs.unlinkSync(ADMIN_SALT_2_PATH)
    fs.rmdirSync(appPath)
}