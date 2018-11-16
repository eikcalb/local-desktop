import User from "./types/User";
import { TrackerStore } from "./tracker";
import Auth from "./auth";
import * as localforage from "localforage";
import Message from "./notification";

export const DOCUMENTS = {
    savedState: 'saved-state'
}


export const DB_NAME = "Local-Desktop-Database"
export const DB_VERSION = 1

//  TODO:   Create a localForage driver to persist changes to firebase database
export const db = localforage.createInstance({
    description: "Storage for application data in NoSQL database. Is should provide a unified api for syncing application data between local and remote server (Firebase).",
    driver: [localforage.INDEXEDDB],
    name: DB_NAME,
    version: DB_VERSION,
    storeName: 'localdesktop'
})


let idb: IDBDatabase;
export function getIDB(force: boolean = false): Promise<IDBDatabase> {
    if (idb || !false) {
        return Promise.resolve(idb)
    } else {
        return new Promise<IDBDatabase>((res, rej) => {
            let request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onupgradeneeded = function ({ target }) {
                if (target) {
                    // Create User store and setup indices
                    let store: IDBObjectStore = (target as IDBOpenDBRequest).result.createObjectStore('users', { keyPath: 'uid' })
                    store.createIndex('email', 'email', { unique: true })
                    store.createIndex('username', 'username', { unique: true })
                }
            }
            request.onsuccess = function (e) {
                idb = this.result
                res(idb)
            }
            request.onerror = e => {
                console.log('Error while opening database', e)
                rej(e)
            }
        })
    }
}


export default interface ILocalStore {
    auth: Auth,
    windowState: {
        isWindowMaximized: boolean,
        isWindowFullscreen: boolean,
        showAppBar: boolean,
        closed?: boolean,
        canToggleAppBar?: boolean
    }
    databaseReady: boolean,
    user: User | null,
    tracker?: TrackerStore
    newNotification?: Message
}

export function defaultStore(): ILocalStore {
    return {
        user: null,
        windowState: {
            isWindowFullscreen: false,
            isWindowMaximized: false,
            showAppBar: false,
            canToggleAppBar: false
        },
        auth: new Auth(),
        databaseReady: false
    }
}