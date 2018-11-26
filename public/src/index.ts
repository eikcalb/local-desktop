import { disconnect, fork, isMaster, isWorker, on, setupMaster, worker } from "cluster";
import { createServer, Server as HttpServer } from "http";
import { cpus } from 'os';
import setupExpress from "./http.server";
import setupWebSocket from "./websocket.server";
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

const DEFAULT_PORT = 8080
const WEBSOCKET_SERVER = 0B010
const HTTP_SERVER = 0B001
const ALL_SERVERS = 0B011
export type Server = typeof WEBSOCKET_SERVER | typeof HTTP_SERVER | typeof ALL_SERVERS

Object.defineProperty(module.exports, 'clusterStarted', { get() { return _clusterStarted } })

function serverIsBalanced(expectedCount: number, currentCount: number = _clusterCount) {
    return currentCount >= (expectedCount - clusterLeeway) && currentCount <= (expectedCount + clusterLeeway)
}

export function startServerCluster(percentageUsage: number, serverMask: Server = ALL_SERVERS) {
    let numberOfWorkers = Math.min(Math.ceil(((percentageUsage / 100) || DEFAULT_SLAVE_PROCESS_PERCENTAGE_CONSUMPTION_EXCLUSIVE) * NUMBER_OF_PROCESSESORS), NUMBER_OF_PROCESSESORS)
    setupMaster({ exec: __filename })
    if (isMaster) {
        on('fork', worker => {
            _clusterCount++
            worker.on('error', console.error)
            worker.on('message', console.log)
            if (_clusterCount > 0) {
                _clusterStarted = true
            }
        })

        on('message', console.log)

        on('exit', (w, c, sig) => {
            _clusterCount--
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

if (isWorker) {
    let port: number
    if (process.env.PORT) {
        port = parseInt(process.env.PORT)
    } else {
        port = DEFAULT_PORT
    }
    try {
        worker.on('message', m => {
            console.log(m)
            worker.send(m)
        })
        worker.send("Hello From Worker " + worker.id)
        const useHttp = (process.env.serverMask || HTTP_SERVER & ALL_SERVERS) === HTTP_SERVER
        const useWebSocket = (process.env.serverMask || WEBSOCKET_SERVER & ALL_SERVERS) === WEBSOCKET_SERVER
        let server: HttpServer | null = null
        if (useHttp) {
            server = createServer(setupExpress())
            worker.send("Worker " + worker.id + " setup for Http Server!")
        }
        if (useWebSocket) {
            setupWebSocket(useHttp && server ? { server } : { port })
            worker.send("Worker " + worker.id + " setup for WebSocket Server!")
        }
        if (useHttp && server) {
            server.listen(port, () => {
                worker.send(`${Date.now()}: Server process (${process.pid}) on worker ${worker.id} started`)
            })
        }

    } catch (e) {
        console.error(e)
    }

}