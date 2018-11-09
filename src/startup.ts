import Auth from "./auth";
let fs = require('fs')
const path = require('path')

export const appPath = path.join(nw.App.dataPath, '.app')

export default function start(password: string) {
    if (isFirstRun()) {
        setup(password)
    }
    log(Log.STARTUP, "Starting Machine...")
}

/**
 * Checks if this is first run of application. Usually indicated by the '.app' directory in user home
 */
export function isFirstRun(): boolean {
    console.log(path.join(nw.App.dataPath, '.app'), fs.existsSync)

    let exists: boolean = true//fs.existsSync(appPath)
    console.log(path.join(nw.App.dataPath, '.app'), exists)
    return exists
}

function setup(password: string) {
    fs.mkdir(appPath, 0o777, (err: any) => {
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
                cipher: 'aes-256-gcm',
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
                    return Promise.resolve()
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
export function log(type: Log, message: string) {
    fs.appendFile(path.join(appPath, 'log.dat'), `${new Date().toISOString()}: ${message}\r\n`, (e: any) => console.log(e ? e : `${message} successfully logged`))
}