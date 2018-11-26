import { IncomingMessage } from "http";
import * as ws from 'ws';

export interface IWebSocketResponse {
    type: string
    data: object
}

export const SYSTEM = 'SYSTEM'

export default function setupWebSocket(options: ws.ServerOptions) {
    const wss = new ws.Server(options)

    wss.on('connection', (socket, req) => {
        if (authenticateWebSocket({ socket, req })) {
            socket.send({
                type: SYSTEM, data: "Access Denied!"
            }, (err) => {
                socket.terminate()
                if (err) throw err
            })
        } else {
            wss.clients
        }

    })


}

export function authenticateWebSocket(info: { socket: ws, req: IncomingMessage }): boolean {
    return false
}