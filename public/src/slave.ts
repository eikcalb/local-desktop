import { isWorker, worker } from "cluster";
import { createServer, Server as HttpServer } from "http";
import { ClusterMessage, ClusterMessageType, HTTP_SERVER, WEBSOCKET_SERVER } from ".";
import setupExpress from "./http.server";
import setupWebSocket from "./websocket.server";

const DEFAULT_PORT = 8080

if (isWorker) {
    let port: number
    if (process.env.PORT) {
        port = parseInt(process.env.PORT)
    } else {
        port = DEFAULT_PORT
    }
    worker.send("Hello From Worker second " + worker.id)

    let clusterConfig: any
    try {
        worker.on('error', worker.process.send)
        worker.on('message', (m: ClusterMessage) => {
            switch (m.type) {
                case ClusterMessageType.INIT:
                    clusterConfig = m.message
                    break
            }
            console.log(m)
            worker.send(m)
        })
        const useHttp = (Number(process.env.serverMask) & HTTP_SERVER) === HTTP_SERVER
        const useWebSocket = (Number(process.env.serverMask) & WEBSOCKET_SERVER) === WEBSOCKET_SERVER
        let server: HttpServer | null = null
        if (useHttp) {
            server = createServer(setupExpress(clusterConfig.httpServer))
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