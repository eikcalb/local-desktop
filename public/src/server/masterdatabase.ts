import { ClusterMessage, ClusterMessageType } from "..";
import { Worker } from "cluster";
import { IQueryInterface, QUERY } from "./database";

/**
 * A database parser that responds to worker requests.
 */

export function _handleDBRequest(db: IDBDatabase, worker: Worker, request: ClusterMessage) {
    let message = request.message as IQueryInterface
    new Promise((res, rej) => {
        let tranx = db.transaction(message.store, 'readwrite')
        tranx.onerror = tranx.onabort = function (e) {
            return rej(this.error)
        }

        let store = tranx.objectStore(message.store)
        switch (message.query) {
            case QUERY.ADD:
                store.add(message.data).addEventListener('success', function () {
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
        }
    }).then(res => {
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