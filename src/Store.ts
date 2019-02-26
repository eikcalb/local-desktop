import User from "./types/User";
import { ITrackerState } from "./tracker";
import Auth from "./auth";
import * as localforage from "localforage";
import Message from "./notification";

export const DOCUMENTS = {
    savedState: 'saved-state',
    SUPER_USERS: 'superusers',
    TRACKER: 'tracker',
    USERS: 'users',
    VEHICLES: 'vehicles'
}


export const DB_NAME = "Local-Desktop-Database"
export const DB_VERSION = 1

//  TODO:   Create a localForage driver to persist changes to firebase database
export const db = localforage.createInstance({
    description: "Storage for application data in NoSQL database. Is should provide a unified api for syncing application data between local and remote server (Firebase).",
    driver: [localforage.INDEXEDDB],
    version: DB_VERSION,
    storeName: 'localdesktop'
})


let idb: IDBDatabase;
export function getIDB(force: boolean = false): Promise<IDBDatabase> {
    if (idb && !force) {
        return Promise.resolve(idb)
    } else {
        return new Promise<IDBDatabase>((res, rej) => {
            let request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onupgradeneeded = function ({ target }) {
                console.log('Upgraging database!', target)
                if (target) {
                    // Create User store and setup indices
                    let store: IDBObjectStore = (target as IDBOpenDBRequest).result.createObjectStore(DOCUMENTS.USERS, { keyPath: 'id' })
                    // store.createIndex('email', 'email', { unique: true })
                    store.createIndex('username', 'username', { unique: true })

                    let superStore: IDBObjectStore = (target as IDBOpenDBRequest).result.createObjectStore(DOCUMENTS.SUPER_USERS, { keyPath: 'id' })
                    superStore.createIndex('email', 'email', { unique: true })
                    superStore.createIndex('username', 'username', { unique: true })

                    // Create Face data store and setup indices
                    let faceStore: IDBObjectStore = (target as IDBOpenDBRequest).result.createObjectStore(DOCUMENTS.TRACKER, { keyPath: 'id', autoIncrement: true })
                    faceStore.createIndex('uid', 'uid', { unique: true })

                    // Create Vehicle store
                    let vehicleStore: IDBObjectStore = (target as IDBOpenDBRequest).result.createObjectStore(DOCUMENTS.VEHICLES, { keyPath: 'id', autoIncrement: true })
                    vehicleStore.createIndex('vid', 'vid', { unique: true })
                    vehicleStore.createIndex('user', 'user', { unique: false, multiEntry: true })


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
    tracker?: ITrackerState
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