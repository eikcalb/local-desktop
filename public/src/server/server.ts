import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
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

    /**
     * This is the current user identified by the supplied token during authorization, @see authorizeUserMiddleware
     */
    public currentUser: string

    constructor(auth: Auth) {
        this.auth = auth
    }

    //  USER MANAGEMENT
    public addUser(username: string, password: string, passwordVerify: string) {
        return new Promise<User>(async (res, rej) => {
            username = username.trim()
            if (!password || password !== passwordVerify) {
                // Do not proceed after this error!
                return rej(new Error("Passwords do not match!"));
            } else {
                let user: User = { username }
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
                            // You might need to preserve the password for encryption
                            //TODO:     Generate new predictible password for encryption
                            delete user.password
                            user.token = await this.createToken({
                            }, { key: this.auth.key.key, passphrase: this.auth.key.pass }, {
                                    header: { typ: 'jwt' },
                                    audience: user.username,
                                    expiresIn: '2 days',
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
            return Promise.reject(new ErrorResponse(err.errno || 406, err.message || "Could not add user!"))
        })
        // return this.auth.registerUser(username, password, passwordVerify).then(({ username, profile, token }: User) => {
        //     return Promise.resolve(new Response<User>({ username, profile, token }))
        // }).catch((err: any) => {
        //     console.error(err)
        //     return Promise.reject(new ErrorResponse(406, "Could not add user!"))
        // })
    }

    public loginUser(username: string, password: string, useToken: boolean = false) {
        process.send!([username, password])
        return new Promise<User>((res, rej) => {
            if (useToken) {
                return this.verifyToken(password, this.auth.key.pubKey, (err, decoded) => {
                    if (err) rej(err)
                    if (decoded) {
                        db({
                            store: DOCUMENTS.USERS,
                            query: QUERY.FIND_INDEX,
                            data: { index: 'username', indexValue: username }
                        }).then(async (result) => {
                            if (result) {
                                let user = result //as User
                                //TODO:     Generate new predictible password for encryption
                                delete user.password
                                user.isNewUser = false
                                user.token = await this.createToken({
                                }, { key: this.auth.key.key, passphrase: this.auth.key.pass }, {
                                        header: { typ: 'jwt' },
                                        audience: user.username,
                                        expiresIn: '8 days',
                                    })
                                return res(user)
                            } else {
                                return rej(new Error('Cannot login with token!'))
                            }
                        }
                        )
                    }
                }, { audience: username })
            }
            db({
                store: DOCUMENTS.USERS,
                query: QUERY.FIND_INDEX,
                data: { index: 'username', indexValue: username }
            }).then(async (result) => {
                if (result) {
                    let user = result //as User
                    // due to message passing, buffer is jsonified...convert to string to prevent this
                    let hash: Buffer = await this.genHash(password, Buffer.from(user.salt))
                    if (timingSafeEqual(hash, Buffer.from(user.password))) {
                        //TODO:     Generate new predictible password for encryption
                        delete user.password
                        user.isNewUser = false
                        user.token = await this.createToken({
                        }, { key: this.auth.key.key, passphrase: this.auth.key.pass }, {
                                header: { typ: 'jwt' },
                                audience: user.username,
                                expiresIn: '2 days',
                            })
                        return res(user)
                    } else {
                        return rej(new Error('Password or username incorrect!'))
                    }
                }
                else {
                    return rej(new Error('Username not found!'))
                }
            }).catch(err => rej(err))
        })
            .then(({ username, profile, token }: User) => {
                return new Response<User>({ username, profile, token });
            }, (err: any) => {
                return Promise.reject(new ErrorResponse(err.errno || 403, err.message || "Login failure"));
            }
            )
    }

    public logoutUser(username: string): any {
        throw new ReferenceError('Unimplemented function called!')
    }


    //  VEHICLE MANAGEMENT
    public getVehicles(user?: string, batch?: { limit: number, count: number }) {
        return new Promise<any>((res, rej) => {
            return db({
                store: DOCUMENTS.VEHICLES,
                query: QUERY.FIND_CURSOR,
                data: { index: 'user', cursorValue: user, batch }
            }).then((value) => {
                return res(new Response<Vehicle>(value || {}))
            }, (err) => {
                return rej(new ErrorResponse(err.errno || 404, err.message || 'Cannot fetch vehicles'))
            })
        })
    }

    //  TODO: Allow @param vehicle to accept string array
    public getVehicleLocation(vehicle: string) {
        return new Promise<Vehicle[]>((res, rej) => {
            return db({
                query: QUERY.FIND_INDEX_ALL,
                store: DOCUMENTS.VEHICLES,
                data: {
                    index: 'vid',
                    indexValue: vehicle
                }
            }).then(async (data: Vehicle[]) => {
                if (data) {
                    return res(data)
                } else {
                    return rej(new Error('Vehicle not found!'))
                }
            }).catch(err => rej(err))
        }).then((vehicles) => {
            return new Response(vehicles.map(({ vid, location, timestamp }) => {
                return { vid, ...location, timestamp }
            }));
        }, (err: any) => {
            return Promise.reject(new ErrorResponse(err.errno || 406, err.message || "Could not set vehicle location!"));
        }
        )
    }

    public setVehicleLocation(vehicle: string, locationData: { longitude: number, latitude: number }) {
        return new Promise<Vehicle>((res, rej) => {
            db({
                query: QUERY.FIND_INDEX,
                store: DOCUMENTS.VEHICLES,
                data: { index: 'vid', indexValue: vehicle }
            }).then(async (vehicle: Vehicle) => {
                if (vehicle) {
                    try {
                        if (vehicle.user !== this.currentUser) { return rej(new Error('Access denied!')) }
                        vehicle.location = locationData
                        vehicle.timestamp = Date.now()
                        let success = await db({
                            query: QUERY.UPDATE,
                            store: DOCUMENTS.VEHICLES,
                            data: vehicle
                        })
                        if (success) {
                            res(vehicle)
                        }
                    } catch (err) {
                        return rej(err)
                    }
                } else {
                    return rej(new Error('Vehicle not found!'))
                }
            }).catch(err => rej(err))
        }).then(() => {
            return new Response();
        }, (err: any) => {
            return Promise.reject(new ErrorResponse(err.errno || 406, err.message || "Could not set vehicle location!"));
        }
        )
    }

    public addVehicle(user: string, vehicle: Vehicle) {
        return new Promise<Vehicle>((res, rej) => {
            if (!vehicle) return rej(new Error('Empty request body!'))
            if (!this.validateVehicleEdition(user, vehicle)) return rej(new Error('Request failed to validate!'))
            db({
                store: DOCUMENTS.VEHICLES,
                query: QUERY.ADD,
                data: vehicle
            }).then(value => {
                if (value) {
                    return res(vehicle)
                } else {
                    return rej(new Error('Failed to add vehicle!'))
                }
            }).catch(err => rej(err))
        }).then(() => {
            return new Response();
        }, (err: any) => {
            return Promise.reject(new ErrorResponse(err.errno || 403, err.message || "Coult not add vehicle at this time!"));
        }
        )
    }

    public removeVehicle(vehicle: string) {
        return new Promise<boolean>((res, rej) => {
            if (!vehicle) return rej(new Error('Empty request body!'))
            db({
                store: DOCUMENTS.VEHICLES,
                query: QUERY.FIND_INDEX,
                data: {
                    index: 'vid',
                    indexValue: vehicle
                }
            }).then(async (value: Vehicle) => {
                if (value) {
                    try {
                        if (value.user !== this.currentUser) return rej(new Error('Access denied!'))
                        let removed = await db({
                            store: DOCUMENTS.VEHICLES,
                            query: QUERY.REMOVE,
                            data: value.id
                        })
                        return removed ? res(true) : rej(new Error('Could not remove vehicle!'))
                    } catch (err) { return rej(err) }
                } else {
                    return rej(new Error('Vehicle not found!'))
                }
            }).catch(err => rej(err))
        }).then(() => {
            return new Response();
        }, (err: any) => {
            return Promise.reject(new ErrorResponse(err.errno || 403, err.message || "Coult not remove vehicle at this time!"));
        }
        )
    }


    public authorizeUserMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
        return new Promise<void>((resolve, rej) => {
            try {
                let authHeader: string = req.headers['x-auth'] as string || (req.headers.authorization ? req.headers.authorization.split(' ', 2)[1] : '')
                if (!authHeader) {
                    return rej(new ErrorResponse(401, 'You are not authorized to use this resource!'))
                } else {
                    this.verifyToken(authHeader, this.auth.key.pubKey, (err: jwt.VerifyErrors, payload: any) => {
                        if (err) return rej(new ErrorResponse(403, err.message))
                        this.currentUser = payload.aud
                        //  TODO: Refresh token here
                        res.setHeader('X-Auth', authHeader)
                        return resolve(next())
                    })
                }
            } catch (err) { return rej(new ErrorResponse(401, err.message)) }
        }).catch((err: ErrorResponse) => {
            // @param err is already an instance of @see ErrorResponse
            // let err = new ErrorResponse(er.errno || 401, er.message)
            res.status(err.errno).json(err).end()
        })
    }

    private validateVehicleEdition(user: string, { color, brand, profile, vid, model, year }: Vehicle) {
        return user !== this.currentUser || typeof brand !== 'string'
            || typeof color !== 'string' || typeof model !== 'string'
            || (profile && typeof profile !== 'string') || (typeof vid !== 'string' || vid === '')
            || (typeof year !== 'number' || year < 1900) ? false : true
    }

    private async genUserKey(key: string) {
        let salt = randomBytes(this.auth.saltLength)
        try {
            let hash = await this.genHash(key, salt)
            return Promise.resolve({ salt, key: hash })
        } catch (e) {
            return Promise.reject(false)
        }


    }

    private genHash(key: string | Buffer, salt: Buffer | string, iteration: number = ITERATION_NUM, size: number = 124): Promise<Buffer> {
        return new Promise((res) => {
            let newKey = pbkdf2Sync(key, salt, iteration, size, this.auth.digest)
            return res(newKey)
        })
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
