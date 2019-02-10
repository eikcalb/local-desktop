import * as express from "express";
import { normalize, resolve } from "path";
import Server from "./server/server";
import { worker } from "cluster";
import { ClusterMessage } from ".";
import { SERVER_STAT_TYPES } from "./server";

export default function setupExpress(auth: Auth) {
    let app: express.Express = express()
    app.use(express.urlencoded())
    app.use(express.json());
    app.use('/static/:file*', express.static(resolve(__dirname, '../asset'), {
        immutable: true,
        maxAge: 60000 * 60 * 24 * 15 // 15 days
    }))
    let server = new Server(auth)


    app.get('/', (req, res, next) => {
        res.sendFile(resolve(__dirname, '..', 'asset', 'index.html'), { dotfiles: 'allow' }, err => {
            if (err) return next(err)
            res.end()
        })
    })

    app.get('/download/android', (req, res, next) => {
        res.type('application/vnd.android.package-archive').download(normalize('../asset/android.apk'), 'local.apk', err => {
            if (err) {
                if (res.headersSent) res.end(); else {
                    res.status(404).send("<b>The file cannot be downloaded</b>. <p>This may be due to file corruption or application failure.\
                   <p> Kindly contact the administrator for support!").end()
                }
            }
        })
    })

    app.post('/user/register', async (req, res, next) => {
        try {
            let response = await server.addUser(req.body.username, req.body.password, req.body['v_password'])
            if (response.data.token) res.setHeader("X-Auth", response.data.token);
            delete response.data.token
            res.json(response)
            worker.send(new ClusterMessage(SERVER_STAT_TYPES.SERVER_NEW_USER, req.body.username, 'worker'))
        } catch (err) {
            res.status(err.errno || 406).json(err)
        }
    })

    app.post('/user/login', async (req, res, next) => {
        try {
            let response = await server.loginUser(req.body.username, req.body.password)
            if (response.data.token) res.setHeader("X-Auth", response.data.token);
            delete response.data.token
            res.json(response)
        } catch (err) {
            res.status(err.errno || 406).json(err)
        }
    })

    app.post('/user/login_token', async (req, res, next) => {
        try {
            let response = await server.loginUser(req.body.username, req.body.token, true)
            if (response.data.token) res.setHeader('X-Auth', response.data.token)
            delete response.data.token
            res.json(response)
        } catch (err) {
            res.status(err.errno || 406).json(err)
        }
    })

    app.get('/vehicles?/:user(\\w+)?', async (req, res, next) => {
        try {
            let vehicles = await server.getVehicles(req.params.user)
            res.json(vehicles).end()
        } catch (err) {
            res.status(err.errno || 406).json(err).end()
        }
    })

    app.post('/vehicles?/:user', server.authorizeUserMiddleware.bind(server), async (req, res, next) => {
        try {
            let response = await server.addVehicle(req.params.user, req.body)
            res.json(response).end()
            worker.send(new ClusterMessage(SERVER_STAT_TYPES.SERVER_NEW_VEHICLE, req.params.user, 'worker'))
        } catch (err) {
            res.status(err.errno || 406).json(err).end()
        }
    })

    app.delete('/vehicles?/:user/:vehicle', server.authorizeUserMiddleware.bind(server), async (req, res, next) => {
        try {
            let response = await server.removeVehicle(req.params.vehicle)
            res.json(response).end()
            worker.send(new ClusterMessage(SERVER_STAT_TYPES.SERVER_DELETE_VEHICLE, req.params.vehicle, 'worker'))
        } catch (err) {
            res.status(err.errno || 406).json(err).end()
        }
    })


    //  Get vehicle location works using a single vehicle or an array of vehicles
    async function _getVehicleLocation(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            let response = await server.getVehicleLocation(req.params.vehicle)
            res.json(response)
        } catch (err) {
            res.status(err.errno || 406).json(err)
        }
    }
    app.get('/vehicles?/location/:vehicle?', server.authorizeUserMiddleware.bind(server), _getVehicleLocation)
    //  TODO: app.post('/vehicles?/location', server.authorizeUserMiddleware, _getVehicleLocation)

    app.patch('/vehicles?/location/:vehicle?', server.authorizeUserMiddleware.bind(server), async (req, res, next) => {
        try {
            let response = await server.setVehicleLocation(req.params.vehicle, req.body)
            res.json(response)
            worker.send(new ClusterMessage(SERVER_STAT_TYPES.SERVER_UPDATE_VEHICLE, req.params.vehicle, 'worker'))
        } catch (err) {
            res.status(err.errno || 406).json(err)
        }
    })



    //  !!!!!   END OF ROUTING  !!!!!
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