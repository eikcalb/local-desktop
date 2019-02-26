import * as express from "express";
import Server from "./server/server";

export default function setupExpress(server: Server) {
    let app: express.Express = express()
    app.use(express.urlencoded())
    app.use(express.json());
    // app.use(express.static('/'))


    app.get('/', (req: any, res: any) => {
        res.status(200).send("<p>lagbaja<p>").end();
    })
    app.get('/vehicles?/:user(\\w)?', async (req, res, next) => {
        try {
            let vehicles = await server.getVehicles(req.params.user)
            res.json(vehicles).end()
        } catch (err) {
            res.status(err.no || 406).json(err).end()
        }
    })

    app.post('/user/register', async (req, res, next) => {
        console.log("Halleluyah!")
        try {
            let response = await server.addUser(req.body.username, req.body.password, req.body['v_password'])
            if (response.data.token) res.setHeader("X-Auth", response.data.token);
            delete response.data.token
            // Remove this in production. This is just a test
            console.log(response)
            res.json(response).end()
        } catch (err) {
            // Remove this in production. This is just a test
            console.log(err)
            res.status(err.no || 406).json(err).end()
        }
    })

    app.post('/user/login', async (req, res, next) => {
        try {
            let response = await server.loginUser(req.body.username, req.body.password)
            if (response.data.token) res.setHeader("X-Auth", response.data.token);
            delete response.data.token
            res.json(response).end()
        } catch (err) {
            res.status(err.no || 406).json(err).end()
        }
    })

    return app
}

export class Response<T=any> {
    public message: 'Successful'
    public data: T

    constructor(data?: any | any[]) {
        this.data = data
    }
}

export class ErrorResponse {
    public error: string[]
    public errno: number

    constructor(errno: number, error: string[] | string) {
        this.errno = errno
        this.error = Array.isArray(error) ? error : [error]
    }
}