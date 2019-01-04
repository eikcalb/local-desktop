import { pbkdf2Sync, randomBytes } from 'crypto';
import * as express from 'express';
import * as jwt from "jsonwebtoken";
// import { DOCUMENTS, getIDB } from "src/store";
// import User from "src/types/User";
// import { Vehicle } from "src/types/vehicle";
import { ErrorResponse, IServerInterface, Response } from ".";
import { db, QUERY } from './database';

export const DOCUMENTS = {
    savedState: 'saved-state',
    SUPER_USERS: 'superusers',
    TRACKER: 'tracker',
    USERS: 'users',
    VEHICLES: 'vehicles'
}
const ITERATION_NUM = 64000 * 10 // The number of iterations should  at least double from `64000` every 2 years period from 2012

export default class Server implements IServerInterface {
    private auth: Auth

    constructor(auth: Auth) {
        this.auth = auth
    }

    public getVehicles(user?: string, batch?: { limit: number, count: number }) {
        return new Promise<Vehicle[]>((res, rej) => {
            // return getIDB()
            //     .then(db => {
            //         const tranx = db.transaction(DOCUMENTS.VEHICLES)
            //         tranx.onerror = function () {
            //             console.log(this.error)
            //             return rej(this.error)
            //         }
            //         const store = tranx.objectStore(DOCUMENTS.VEHICLES)
            //         let cursor: IDBRequest
            //         if (user) {
            //             let index = store.index('user')
            //             cursor = index.openCursor(user, 'next')

            //         } else {
            //             cursor = store.openCursor(undefined, 'next')
            //         }
            //         let _cursorOpen = false
            //         let result: Vehicle[] = []
            //         cursor.addEventListener('success', function () {
            //             if (this.result) {
            //                 if (batch) {
            //                     if (_cursorOpen || batch.limit == 0) {
            //                         batch.count--
            //                         result.push(this.result.value as Vehicle)
            //                         return this.result.continue()
            //                     } else {
            //                         _cursorOpen = true
            //                         return this.result.advance(batch.limit)
            //                     }
            //                 } else {
            //                     result.push(this.result.value as Vehicle)
            //                     return this.result.continue()
            //                 }
            //             }
            //             _cursorOpen = false
            //             return res(result)
            //         })
            //     }).then((value): Response => {
            //         return new Response(value)
            //     }, (err): ErrorResponse => {
            //         return new ErrorResponse(404, 'Cannot fetch vehicles')
            //     })
        })
    }


    public addUser(username: string, password: string, passwordVerify: string) {
        console.log('lagbajajajaja')
        return new Promise<User>(async (res, rej) => {
            username = username.trim()
            if (!password || password !== passwordVerify) {
                // Do not proceed after this error!
                return rej(new Error("Passwords do not match!"));
            } else {
                let user = username as User
                user.isNewUser = user.isactive = user.isPrivate = true
                // let store = tranx.objectStore(DOCUMENTS.USERS)
                // 
                // let nameIndex = store.index('username')
                // let emailndex = store.index('email')
                let key = await this.genUserKey(password);
                if (!key) {
                    return rej(new Error('Could not generate password!'))
                }
                user.password = key.key
                user.salt = key.salt
                user.id = randomBytes(this.auth.saltLength).toString('hex')
                db({
                    store: DOCUMENTS.USERS,
                    query: QUERY.ADD,
                    data: user
                }).then(async (result) => {
                    if (result) {
                        try {
                            console.log(result)
                            // You might need to preserve the password for encryption
                            //TODO:     Generate new predictible password for encryption
                            delete user.password
                            user.token = await this.createToken({
                                iat: Date.now()
                            }, { key: this.auth.key.key, passphrase: this.auth.key.pass }, {
                                    header: { typ: 'jwt' },
                                    audience: user.username,
                                    expiresIn: '15m',
                                })
                            return res(user)
                        } catch (err) {
                            return rej(err)
                        }
                    } else {
                        return rej(new Error('Could not add user!'))
                    }
                }).catch(err => rej(err))
            }
        }).then(({ username, profile, token }: User) => {
            return Promise.resolve(new Response<User>({ username, profile, token }))
        }).catch((err: any) => {
            console.error(err)
            return Promise.reject(new ErrorResponse(406, "Could not add user!"))
        })
        // return this.auth.registerUser(username, password, passwordVerify).then(({ username, profile, token }: User) => {
        //     return Promise.resolve(new Response<User>({ username, profile, token }))
        // }).catch((err: any) => {
        //     console.error(err)
        //     return Promise.reject(new ErrorResponse(406, "Could not add user!"))
        // })
    }

    public loginUser(username: string, token: string) {
        return this.auth.loginUser(username, token).then(({ username, profile, token }: User) => {
            return new Response<User>({ username, profile, token });
        }, (err: any) => {
            return Promise.reject(new ErrorResponse(403, ["Login failure"]));
        }
        )
    }

    public logoutUser(username: string): any {
        throw new ReferenceError('Unimplemented function called!')
    }

    public authorizeUserMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
        return new Promise((res, rej) => {
            let authHeader = req.headers.authorization
            if (!authHeader) {
                return rej(new ErrorResponse(401, 'You are not authorized to view this resource!'))
            } else {
                this.verifyToken(authHeader.split(' ', 2)[0], this.auth.key.pubKey, (err: jwt.VerifyErrors, payload: any) => {
                    if (err) return rej(new ErrorResponse(403, err.message))
                    return res(payload)
                })
            }
        }).then(value => {
            next()
        }).catch(err => {
            res.status(err.errno || 401).json(err).end()
        })
    }

    private async genUserKey(key: string) {
        let salt = randomBytes(this.auth.saltLength)
        try {
            let hash = await new Promise((res) => {
                let newKey = pbkdf2Sync(key, salt, ITERATION_NUM, this.auth.keySize, this.auth.digest)
                return res(newKey)
            })
            return Promise.resolve({ salt, key: hash.toString() })
        } catch (e) {
            return Promise.reject(false)
        }


    }

    createToken(payload: {}, pkey: any, options?: jwt.SignOptions, callback?: jwt.SignCallback): Promise<string> {
        return new Promise((res, rej) => {
            jwt.sign(payload, pkey, { algorithm: 'RS512', ...options }, callback || function (err: any, encoded: string) {
                if (err) rej(err)
                return res(encoded)
            })
        })
    }

    verifyToken(token: string, pubkey: any, callback: jwt.VerifyCallback, opts?: jwt.VerifyOptions) {
        return jwt.verify(token, pubkey, { algorithms: ['RS512'], ...opts }, callback)
    }
}
