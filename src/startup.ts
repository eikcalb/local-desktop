import Auth, { ADMIN_SALT_1_PATH, ADMIN_SALT_2_PATH } from "./auth";
let fs = window.require('fs')
const path = window.require('path')

export const appPath = path.join(nw.App.dataPath, '.app')

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
    console.log(path.join(nw.App.dataPath, '.app'), fs.existsSync)
    let exists: boolean = fs.existsSync(appPath)
    console.log(exists)
    return !exists
}

function setupAppDir(callback: (err?: any) => any): void {
    fs.exists(appPath, (itExists: boolean) => {
        if (itExists) callback()
        else fs.mkdir(appPath, 0o777, callback)
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
    let window = nw.Window.get()
    let size = 'Restore'
    window.on('maximize', () => {
        size = 'Maximize'
        root.className = size
    })
        .on('restore', () => {
            size = 'Restore'
            root.className = size
        })
        .on('enter-fullscreen', () => {
            size = 'Fullscreen'
            root.className = size
        })
    if (!root.classList.contains('Restore') && root.classList.contains('Maximize')) {
        root.classList.add('Restore')
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