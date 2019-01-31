import { Worker } from "cluster";
import { ClusterMessage, ClusterMessageType } from "..";
import { IQueryInterface, QUERY } from "./database";

/**
 * A database parser that responds to worker requests.
 */

export function _handleDBRequest(db: IDBDatabase, worker: Worker, request: ClusterMessage) {
    let message = request.message as IQueryInterface
    __requestHandler(db, message).then(res => {
        let response = new ClusterMessage(ClusterMessageType.WORKER_DATABASE_REQUEST, res || true)
        response._requestID = request._requestID
        return response
    }, err => {
        let response = new ClusterMessage(ClusterMessageType.WORKER_DATABASE_REQUEST, false)
        response._requestID = request._requestID
        response.error = err
        return response
    }).then(message => {
        worker.send(message)
    })

}

function __requestHandler(db: IDBDatabase, message: IQueryInterface, transaction?: IDBTransaction, existingStore?: IDBObjectStore) {
    return new Promise((res, rej) => {
        let tranx: IDBTransaction
        if (transaction) {
            tranx = transaction
        } else {
            tranx = db.transaction(message.store, 'readwrite')
            tranx.onerror = tranx.onabort = function () {
                return rej(this.error)
            }
        }


        let store = existingStore || tranx.objectStore(message.store)
        switch (message.query) {
            case QUERY.UPDATE:
                store.put(message.data).addEventListener('success', function () {
                    if (!message.data) return rej(new Error('Fields are empty!'))
                    if (this.result) {
                        try {
                            return res(this.result)
                        } catch (err) {
                            tranx.abort()
                            return rej(err)
                        }
                    } else {
                        tranx.abort()
                        return rej(new Error('Could not add record!'))
                    }
                })
                break
            case QUERY.ADD:
                store.add(message.data).addEventListener('success', function () {
                    if (!message.data) return rej(new Error('Fields are empty!'))
                    if (this.result) {
                        try {
                            return res(this.result)
                        } catch (err) {
                            tranx.abort()
                            return rej(err)
                        }
                    } else {
                        tranx.abort()
                        return rej(new Error('Could not add record!'))
                    }
                })
                break
            case QUERY.FIND_INDEX:
                var index = store.index(message.data.index as string)
                if (!message.data.indexValue) return rej(new Error('Invalid request!'))
                index.get(message.data.indexValue as string).addEventListener('success', async function (e) {
                    if (this.result) {
                        return res(this.result)
                    }
                    else {
                        tranx.abort()
                        return rej(new Error('Not found!'))
                    }
                })
                break
            case QUERY.FIND_INDEX_ALL:
                var index = store.index(message.data.index as string)
                if (!message.data.indexValue) return rej(new Error('Invalid request!'))
                index.getAll(message.data.indexValue as string).addEventListener('success', async function (e) {
                    if (this.result) {
                        return res(this.result)
                    }
                    else {
                        tranx.abort()
                        return rej(new Error('Not found!'))
                    }
                })
                break
            case QUERY.FIND_CURSOR:
                var index = store.index(message.data.index as string)
                let cursor = index.openCursor(message.data.cursorValue || undefined, 'next')
                let _cursorOpen = false
                let { batch } = message.data
                let result: any[] = []
                cursor.addEventListener('success', function () {
                    if (this.result) {
                        if (batch) {
                            if (_cursorOpen || batch.limit == 0) {
                                batch.count--
                                result.push(this.result.value)
                                return this.result.continue()
                            } else {
                                _cursorOpen = true
                                return this.result.advance(batch.limit)
                            }
                        } else {
                            result.push(this.result.value)
                            return this.result.continue()
                        }
                    }
                    _cursorOpen = false
                    return res(result)
                })
                break
            case QUERY.REMOVE:
                if (!message.data) {
                    tranx.abort()
                    return rej(new Error('Invalid request!'))
                }
                store.delete(message.data as string).addEventListener('success', async function (e) {
                    if (this.result) {
                        tranx.abort()
                        return rej(new Error(this.result))
                    }
                    else {
                        return res()
                    }
                })
                break
            case QUERY.REMOVE_INDEX:
                var index = store.index(message.data.index as string)
                if (!message.data.indexValue) return rej(new Error('Invalid request!'))
                index.get(message.data.indexValue as string).addEventListener('success', async function (e) {
                    if (this.result) {
                        return res(await __requestHandler(db, {
                            query: QUERY.REMOVE,
                            store: message.store,
                            data: this.result[Array.isArray(store.keyPath) ? store.keyPath[0] : store.keyPath]
                        }, tranx))
                    }
                    else {
                        tranx.abort()
                        return rej(new Error('Not found!'))
                    }
                })
                break
        }
    })
}