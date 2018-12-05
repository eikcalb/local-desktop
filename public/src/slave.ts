import { isWorker, worker } from "cluster";
import { createServer, Server as HttpServer } from "http";
import setupExpress from "./http.server";
import setupWebSocket from "./websocket.server";
import { ALL_SERVERS, HTTP_SERVER, WEBSOCKET_SERVER } from ".";

const DEFAULT_PORT = 8080


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
        const useHttp = (Number(process.env.serverMask) & HTTP_SERVER) === HTTP_SERVER
        const useWebSocket = (Number(process.env.serverMask) & WEBSOCKET_SERVER) === WEBSOCKET_SERVER
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