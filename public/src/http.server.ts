import * as express from "express";
import Auth from "../../src/auth";
import { DOCUMENTS, getIDB } from "../../src/store";
import User from "../../src/types/User";
import { Vehicle } from "../../src/types/vehicle";


export default function setupExpress() {
    let app: express.Express = express()
    let httpServer = new HttpServer(app)

    app.get('/', (req: any, res: any) => {
        res.status(200).send("<p>lagbaja<p>").end();
    })
    app.get('/vehicles?/:user(\\w)?', async (req, res, next) => {
        let vehicles = await httpServer.getVehicles(req.params.user)
        res.send(JSON.stringify(vehicles)).end()
    })

    app.get('/user/register', async (req, res, next) => {
        let response = await httpServer.addUser(req.body.username, req.body.email, req.body.password, req.body.passwordVerify)
        if (response.data.token) res.setHeader("X-Auth", response.data.token);
        delete response.data.token
        res.send(JSON.stringify(response)).end()
    })

    app.get('/user/login', async (req, res, next) => {
        let response = await httpServer.loginUser(req.body.username, req.body.password)
        if (response.data.token) res.setHeader("X-Auth", response.data.token);
        delete response.data.token
        res.send(JSON.stringify(response)).end()
    })

    app.get('/webhook', (req: any, res: any) => {
        const TOKEN_VERIFY = 'lord'
        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];
        if (mode && token) {

            // Checks the mode and token sent is correct
            if (mode === 'subscribe' && token === TOKEN_VERIFY) {

                // Responds with the challenge token from the request
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge).end();

            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
                res.sendStatus(403).end();
            }
        }

    })
    app.post('/webhook', (req: any, res: any) => {
    })

    return app
}

class HttpServer {
    private auth: Auth
    constructor(app: express.Express) {
        app.use(express.urlencoded())
        app.use(express.json());
        // app.use(express.static('/'))

        app.use((req, res, next) => {
            res.contentType('application/json')
            next()
        })
    }

    /**
     * Fetches all vehicles registered on the platform or for a particular user.
     * 
     * @param user username of vehicle owner to retrieve
     * @param batch starting point and amount of records to fetch
     */
    public getVehicles(user?: string, batch?: { limit: number, count: number }) {
        return new Promise<Vehicle[]>((res, rej) => {
            return getIDB()
                .then(db => {
                    const tranx = db.transaction(DOCUMENTS.VEHICLES)
                    tranx.onerror = function () {
                        console.log(this.error)
                        return rej(this.error)
                    }
                    const store = tranx.objectStore(DOCUMENTS.VEHICLES)
                    let cursor: IDBRequest<IDBCursorWithValue | null>
                    if (user) {
                        let index = store.index('user')
                        cursor = index.openCursor(user, 'next')

                    } else {
                        cursor = store.openCursor(undefined, 'next')
                    }
                    let _cursorOpen = false
                    let result: Vehicle[] = []
                    cursor.addEventListener('success', function () {
                        if (this.result) {
                            if (batch) {
                                if (_cursorOpen || batch.limit == 0) {
                                    batch.count--
                                    result.push(this.result.value as Vehicle)
                                    return this.result.continue()
                                } else {
                                    _cursorOpen = true
                                    return this.result.advance(batch.limit)
                                }
                            } else {
                                result.push(this.result.value as Vehicle)
                                return this.result.continue()
                            }
                        }
                        _cursorOpen = false
                        return res(result)
                    })
                }).then((value): Response => {
                    return new Response(value)
                }, (err): ErrorResponse => {
                    return new ErrorResponse(5, 'Cannot fetch vehicles')
                })
        })
    }

    public addUser(username: string, email: string, password: string, passwordVerify: string) {
        return this.auth.registerUser(username, email, password, passwordVerify).then(({ username, profile, token }: User) => {
            return Promise.resolve(new Response<User>({ username, profile, token }))
        }).catch(err => Promise.reject(new ErrorResponse(3, "Could not add user!")))
    }

    public loginUser(username: string, token: string) {
        return this.auth.loginUser(username, token).then(({ username, profile, token }: User) => {
            return new Response<User>({ username, profile, token });
        }, err => {
            return Promise.reject(new ErrorResponse(4, ["Login failure"]));
        }
        )
    }

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