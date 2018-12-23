import { disconnect, fork, isMaster, on, setupMaster } from "cluster";
import { cpus } from 'os';
import { join } from "path";
import { createServer } from "http";
import setupExpress from "./http.server";
//TODO:     Implement statics gathering algorithm for the servers
// import ClusterInfo from "./clusterinfo";


const NUMBER_OF_PROCESSESORS: number = cpus().length
/**
 * The percentage of processes(slaves) running relative to the number of available processors minus the master process
 */
const DEFAULT_SLAVE_PROCESS_PERCENTAGE_CONSUMPTION_EXCLUSIVE: number = 0.3//30%

let _clusterStarted = false
let _clusterCount = 0
let _retryCount = 0
let _canDisconnect: boolean = false
let clusterLeeway = 1

export const WEBSOCKET_SERVER = 0B010
export const HTTP_SERVER = 0B001
export const ALL_SERVERS = 0B011
export type Server = typeof WEBSOCKET_SERVER | typeof HTTP_SERVER | typeof ALL_SERVERS

Object.defineProperty(module.exports, 'clusterStarted', { get() { return _clusterStarted } })

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
export function startServerCluster(server: any, percentageUsage: number, serverMask: Server = HTTP_SERVER) {
    let numberOfWorkers = Math.min(Math.ceil(((percentageUsage / 100) || DEFAULT_SLAVE_PROCESS_PERCENTAGE_CONSUMPTION_EXCLUSIVE) * NUMBER_OF_PROCESSESORS), NUMBER_OF_PROCESSESORS)
    setupMaster({ exec: join(__dirname, 'slave.js'), silent: false })
    if (!server || typeof server !== 'object') throw new ReferenceError('Server config must be an object instance!')
    if (isMaster) {
        on('fork', worker => {
            _clusterCount++
            worker.on('error', console.error)
            worker.on('message', console.log)
            if (_clusterCount > 0) {
                _clusterStarted = true
            }
        })

        on('online', worker => {
            // Set cluster config with objects required for application to function
            worker.send(new ClusterMessage(ClusterMessageType.INIT, server), null, (err) => {
                if (err) {
                    console.log(err)
                    console.info(`Worker ${worker.id} could not be initialized!`, '... Kill it!...')
                    worker.kill()
                }
            })
        })

        on('message', console.log)

        on('exit', (w, c, sig) => {
            _clusterCount = Math.max(_clusterCount - 1, 0)
            if (!_canDisconnect && !serverIsBalanced(numberOfWorkers) && _retryCount < 5) {
                console.log(fork({ serverMask }))
                _retryCount++
            }
            if (_clusterCount < 1) {
                _clusterStarted = false
            }
            console.log(c, sig, _clusterCount)
        })
        for (let i = 0; i < numberOfWorkers; i++) {
            fork({ serverMask })
        }
    }
}

export function stopCluster() {
    _canDisconnect = true
    disconnect(() => { console.log("It has ended!") })
}

export function startTestServer(auth: any) {
    let server = createServer(setupExpress(auth))
    if (process.env.PORT) {
        server.listen(parseInt(process.env.PORT), () => {
            console.log(`${Date.now()}: Server process (${process.pid}) on worker started`)
        }
        )
    } else {
        server.listen(8080, () => {
            console.log(`${Date.now()}: Server process (${process.pid}) on worker started`)
        })
    }
}

export class ClusterMessage {
    type: ClusterMessageType
    message: any
    public from: string

    constructor(type: ClusterMessageType, message: any, from?: string) {
        this.message = message
        this.type = type
        this.from = from ? from.toLowerCase() : 'master'
    }
}

export enum ClusterMessageType {
    INIT, WORKER_ERROR
}