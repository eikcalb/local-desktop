import * as express from 'express';
import { VerifyErrors } from "jsonwebtoken";
import Auth from "src/auth";
import { DOCUMENTS, getIDB } from "src/store";
import User from "src/types/User";
import { Vehicle } from "src/types/vehicle";
import { ErrorResponse, IServerInterface, Response } from ".";

export default class Server implements IServerInterface {
    private auth: Auth

    constructor(auth: Auth) {
        this.auth = auth
    }

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
                    let cursor: IDBRequest
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
                    return new ErrorResponse(404, 'Cannot fetch vehicles')
                })
        })
    }


    public addUser(username: string, password: string, passwordVerify: string) {
        console.log('lagbajajajaja')

        return this.auth.registerUser(username, password, passwordVerify).then(({ username, profile, token }: User) => {
            return Promise.resolve(new Response<User>({ username, profile, token }))
        }).catch((err: any) => {
            console.error(err)
            return Promise.reject(new ErrorResponse(406, "Could not add user!"))
        })
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
                this.auth.verifyToken(authHeader.split(' ', 2)[0], this.auth.getPublicKey(), (err: VerifyErrors, payload: any) => {
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
}
