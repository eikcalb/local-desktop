import { randomBytes } from "crypto";
import { ClusterMessage, ClusterMessageType } from "..";
import { isWorker } from "cluster";


const QUEUE_KEY_BYTE_LENGTH = 32
const MAX_QUEUE_KEY_RETRY = 8

export const QUERY = {
    FIND: 'find',
    ADD: 'add'
}

export interface IQueryInterface {
    store: string,
    query: string,
    data: any
}

/**
 * Queue backing callback store.
 * 
 * This **SHOULD NOT** be exported!
 */
let queue: Map<Buffer, (data: any) => any> = new Map()

/**
 * This is a messaging interface to access application database from workers.
 * 
 * This api is agnostic and interpretation is up to the respective parties.
 * `spec` is an object with details relevant for the db request.
 * 
 * @returns Promise<any> that resolves to the query result (implementation dependent) on success or
 *          rejects with an error on failure. If a callback is provided, it will be called on success
 *          and the promise will not return a result.
 */
export function db(spec: IQueryInterface, callback?: (result: any) => any): Promise<any> {
    return new Promise((res, rej) => {
        //  TODO: run validation here
        let id = randomBytes(QUEUE_KEY_BYTE_LENGTH)
        let message = new ClusterMessage(ClusterMessageType.WORKER_DATABASE_REQUEST, spec, process.pid.toString())
        if (queue.has(id)) {
            for (let count = 0; queue.has(id); count++) {
                id = randomBytes(QUEUE_KEY_BYTE_LENGTH)
                if (count > MAX_QUEUE_KEY_RETRY) rej(new Error('Cannot create add to request queue!')); else continue
            }
        }
        message._requestID = id

        queue.set(message._requestID, result => {
            if (callback && typeof callback === 'function') {
                return callback(result)
            } else {
                return res(result)
            }
        })
        process.send!(message)
    })
}

export function _handleDBRequestCallback(result: ClusterMessage) {
    if (!isWorker) return
    let callback
    if (queue.has(result._requestID) && (callback = queue.get(result._requestID))) {
        queue.delete(result._requestID)
        callback(result.message)
        return
    }
}