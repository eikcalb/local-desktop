import { disconnect, fork, isMaster, setupMaster, workers, on } from "cluster";
import { createServer } from "http";
import { cpus } from 'os';
import { join } from "path";
import setupExpress from "./http.server";
import { _handleDBRequest } from "./server/masterdatabase";
//TODO:     Implement statics gathering algorithm for the servers
// import ClusterInfo from "./clusterinfo";


const NUMBER_OF_PROCESSESORS: number = cpus().length
/**
 * The percentage of processes(slaves) running relative to the number of available processors minus the master process
 */
const DEFAULT_SLAVE_PROCESS_PERCENTAGE_CONSUMPTION_EXCLUSIVE: number = 0.3//30%

let _clusterStarted = false
export let _clusterCount = 0
let _retryCount = 0
let _canDisconnect: number = 0
let clusterLeeway = 1

let _numberOfWorkers: number

export const WEBSOCKET_SERVER = 0B010
export const HTTP_SERVER = 0B001
export const ALL_SERVERS = 0B011
export type Server = typeof WEBSOCKET_SERVER | typeof HTTP_SERVER | typeof ALL_SERVERS

function serverIsBalanced(expectedCount: number, currentCount: number = _clusterCount) {
    return currentCount >= (expectedCount - clusterLeeway) && currentCount <= (expectedCount + clusterLeeway)
}

/**
 * Starts cluster servers according to the `serverMask` provided.
 * The clusters are started first then the master starts the servers when appropriate.
 * 
 * @param server Object for server configuration
 * @param percentageUsage Number indicating percentage of CPU usage
 * @param serverMask 0b01 for HTTP server, 0b10 for WebSocket server
 */
export function startServerCluster(server: IClusterConfig, percentageUsage: number, serverMask: Server = HTTP_SERVER) {
    _numberOfWorkers = Math.min(Math.ceil(((percentageUsage / 100) || DEFAULT_SLAVE_PROCESS_PERCENTAGE_CONSUMPTION_EXCLUSIVE) * NUMBER_OF_PROCESSESORS), NUMBER_OF_PROCESSESORS)
    setupMaster({ exec: join(__dirname, 'slave.js'), silent: false })

    //  Function should not be called more than once. use `numberOfWorkers` to spawn new workers.
    if (_clusterStarted) {
        console.warn("Cluster can only be started once!", "Set the number of workers directly to spawn more workers.")
        if (module.exports.numberOfWorkers) module.exports.numberOfWorkers = _numberOfWorkers
        return
    }
    if (!server || typeof server !== 'object') throw new ReferenceError('Server config must be an object instance!')
    if (isMaster) {
        if (module.exports.numberOfWorkers === undefined) {
            Object.defineProperty(module.exports, 'numberOfWorkers', {
                get() { return _clusterCount },

                /**
                 * This will set the number of workers in the cluster.
                 * It will calculate the difference in the initial and desired values then start or kill wokers as needed.
                 * 
                 * @param val Number of workers in cluster
                 */
                set(val: number) {
                    val = Math.max(Math.min(val, NUMBER_OF_PROCESSESORS), 0)
                    let clusterDiff = _clusterCount - val
                    // Current worker count is less than desired.
                    if (clusterDiff < 0) {
                        _canDisconnect = 0
                        for (let i = 0; i < Math.abs(clusterDiff); i++) {
                            if ((i + _clusterCount) > NUMBER_OF_PROCESSESORS) break
                            fork({ serverMask })
                        }
                    }
                    // Current worker count is more than desired
                    else if (clusterDiff > 0) {
                        _canDisconnect = clusterDiff
                        for (let index in workers) {
                            if (clusterDiff > 0) {
                                workers[index]!.disconnect()
                                --clusterDiff
                            } else {
                                break
                            }
                        }
                    }
                    // Current worker count is exact as required number of workers
                    else {
                        return
                    }
                }
            })
        }

        on('fork', (worker) => {
            _clusterCount++
            worker.on('error', console.error)
            // if (_clusterCount > 0) {
            //     _clusterStarted = true
            // }
        })
        on('online', (worker) => {
            // Set cluster instance with objects required for application to function
            worker.send(new ClusterMessage(ClusterMessageType.INIT, server), null, (err) => {
                if (err) {
                    console.log(err)
                    console.info(`Worker ${worker.id} could not be initialized!`, '... Kill it!!!!!!...')
                    worker.kill()
                }
            })
        })

        // Cluster should be resilient and exit must be controlled by application explicitly.
        // TODO:  Implement logic to allow changing cluster count
        on('exit', (worker, c, sig) => {
            _clusterCount = Math.max(_clusterCount - 1, 0)
            //  Check the number of workers avalable to discconnect, if less than 1, check if the number of workers is above required.
            //  If the server is not balanced and the retry count (the amount of time to retry worker creation incase of error)
            //  is below a specified amount, fork a new process.
            // 
            //  Retry count is global and if one worker fails to restart more than retryCount,
            //  an error is thrown and new workers will not be spawned thereafter.
            //  This prevents infinitely creating instances.
            if ((_canDisconnect < 1) && !serverIsBalanced(_numberOfWorkers)) {
                if (_retryCount < 2) {
                    console.log(fork({ serverMask }))
                    _retryCount++
                } else {
                    throw new Error('Worker restart failed!')
                }
            } else if (_canDisconnect > 0) {
                _canDisconnect = Math.max(_canDisconnect - 1, 0)
            }
            // if (_clusterCount < 1) {
            //     _clusterStarted = false
            // }
            console.log(c, sig, _clusterCount)
        })
        on('message', (worker, message) => {
            console.log(message)
            if (message.type) {
                switch (message.type) {
                    case ClusterMessageType.WORKER_DATABASE_REQUEST:
                        _handleDBRequest(server.db, worker, message)
                        break
                }
                return
            }
        })
        for (let i = 0; i < _numberOfWorkers; i++) {
            fork({ serverMask })
        }
        _clusterStarted = true
    }
}

export function stopCluster() {
    _canDisconnect = _clusterCount
    disconnect(() => { console.log("It has ended!") })
}

export function startTestServer(auth: any) {
    let server = createServer(setupExpress(auth))
    if (process.env.PORT) {
        server.listen(parseInt(process.env.PORT), () => {
            console.log(`${new Date().toISOString()}: Server process (${process.pid}) on master started`)
        }
        )
    } else {
        server.listen(8080, () => {
            console.log(`${new Date().toISOString()}: Server process (${process.pid}) on master started`)
        })
    }
}

export class ClusterMessage {
    type: ClusterMessageType
    message: any
    public from: string
    public _requestID: string
    public error: Error

    constructor(type: ClusterMessageType, message: any, from?: string) {
        this.message = message
        this.type = type
        this.from = from ? from.toLowerCase() : 'master'
    }
}

export enum ClusterMessageType {
    INIT, WORKER_NOTIFICATION, WORKER_ERROR, WORKER_DATABASE_REQUEST
}

export interface IClusterConfig {
    auth: any,
    db: IDBDatabase
}