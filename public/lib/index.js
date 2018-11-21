import { fork, isMaster, isWorker } from "cluster";
import * as express from "express";
import { createServer } from "http";
import * as ws from 'ws';
import { cpus } from 'os';
import setupExpress from "./http.server";
import setupWebSocket from "./websocket.server";
//TODO:     Implement statics gathering algorithm for the servers
// import ClusterInfo from "./clusterinfo";
const NUMBER_OF_PROCESSESORS = cpus().length;
/**
 * The percentage of processes(slaves) running relative to the number of available processors minus the master process
 */
const DEFAULT_SLAVE_PROCESS_PERCENTAGE_CONSUMPTION_EXCLUSIVE = 0.5; //50%
export let clusterStarted = false;
export function startServerCluster(percentageUsage) {
    if (isMaster) {
        let numberOfSlaves = Math.min(Math.ceil((percentageUsage || DEFAULT_SLAVE_PROCESS_PERCENTAGE_CONSUMPTION_EXCLUSIVE) * NUMBER_OF_PROCESSESORS), NUMBER_OF_PROCESSESORS);
        for (let i = 0; i < numberOfSlaves; i++) {
            let worker = fork();
            worker.on('online', () => {
                console.log(`${Date.now()}: Worker ${i + 1} (${worker.id}) is online!`);
            });
            worker.on('exit', () => {
                console.log(`${Date.now()}: Worker ${i + 1} (${worker.id}) is offline!`);
            });
        }
        clusterStarted = true;
    }
}
if (isWorker) {
    let app = express();
    setupExpress(express, app);
    let server = createServer(app);
    let wss = new ws.Server({ server });
    setupWebSocket(wss);
    server.listen(process.env.PORT || 8080);
}
//# sourceMappingURL=index.js.map