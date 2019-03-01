//TODO:  Remove this c and replae declarations with crypto constant defined below ---  DONE !!!!!
import * as jsonwebtoken from "jsonwebtoken";
import User from "src/types/User";
import { appPath } from "../startup";
import { db, DOCUMENTS, getIDB } from "../store";
import { IFaceData, ITrackerState } from "../tracker";
import SuperUser from "../types/SuperUser";
const crypto = window.require('crypto')
const fs = window.require('fs')
const { join } = window.require('path')
const util = window.require('util')
const jwt = window.require('jsonwebtoken')

const IV_SEPARATOR = '.'
const ITERATION_NUM = 64000 * 10 // The number of iterations should  at least double from `64000` every 2 years period from 2012
export const ADMIN_SALT_1_PATH = join(nw.App.dataPath, '.v1.admin.salt')
export const ADMIN_SALT_2_PATH = join(nw.App.dataPath, '.v1.admin.salt2')
// const ROOT_PASSWORD='LAGBAJA'

export default class Auth {
    private key: { key: string, pass: string, pubKey?: string }
    // private salt: Buffer | string
    public adminKey: { key?: Buffer | string, pass?: Buffer | string, pubKey?: Buffer | string }
    // public adminSalt: Buffer | string
    private digest: string = 'sha512'
    private keySize: number = 124
    private saltLength: number = 48

    constructor() {
        // this.key = process.env.LOCAL_PASSWORD
    }

    async genAdminKey(key: string): Promise<{ key: string | Buffer, salt: string | Buffer } | false> {
        let salt = crypto.randomBytes(this.saltLength)
        let salt2 = crypto.randomBytes(this.saltLength)
        try {
            let hash = await this.genHash(key, salt)
            let hash2 = await this.genHash(key, salt2, ITERATION_NUM / 10, this.keySize / 2)
            fs.writeFileSync(ADMIN_SALT_1_PATH, salt)
            fs.writeFileSync(ADMIN_SALT_2_PATH, salt2)
            db.setItem('.v1.admin.passwordHash', hash, (err) => {
                if (err) throw err
            })
            // HASH2 should be utf8 encoded to prevent errors while creating keypair
            return Promise.resolve({ salt: salt2, key: hash2.toString() })
        } catch (e) {
            console.log(e, `salt1: ${salt}`, `salt2: ${salt2}`)
            return Promise.reject(false)
        }
    }

    async genUserKey(key: string): Promise<{ key: string | Buffer, salt: string | Buffer } | false> {
        let salt = crypto.randomBytes(this.saltLength)
        try {
            let hash = await this.genHash(key, salt)
            return Promise.resolve({ salt, key: hash.toString() })
        } catch (e) {
            return Promise.reject(false)
        }
    }

    private genHash(key: string | Buffer, salt: Buffer | string, iteration: number = ITERATION_NUM, size: number = this.keySize): Promise<Buffer> {
        return new Promise((res) => {
            let newKey = crypto.pbkdf2Sync(key, salt, iteration, size, this.digest)
            return res(newKey)
        })
    }

    public getPublicKey() {
        return this.key.pubKey
    }

    public async registerUser(username: string, password: string, passwordVerify: string): Promise<User> {
        let auth = this
        return new Promise<User>((res, rej) => {
            username = username.trim()
            if (!password || password !== passwordVerify) {
                // Do not proceed after this error!
                return rej(new Error("Passwords do not match!"));
            } else {
                getIDB(true).then(async db => {
                    let tranx = db.transaction(DOCUMENTS.USERS, 'readwrite')
                    tranx.onerror = tranx.onabort = function (e) {
                        return rej(this.error)
                    }
                    let user = new User(username)
                    user.isNewUser = user.isactive = user.isPrivate = true
                    let store = tranx.objectStore(DOCUMENTS.USERS)
                    // let nameIndex = store.index('username')
                    // let emailndex = store.index('email')
                    let key = await this.genUserKey(password);
                    if (!key) {
                        tranx.abort()
                        return rej(new Error('Could not generate password!'))
                    }
                    user.password = key.key.toString()
                    user.salt = key.salt
                    user.id = crypto.randomBytes(auth.saltLength).toString('hex')
                    store.add(user).addEventListener('success', async function () {
                        if (this.result) {
                            try {
                                console.log(this.result)
                                // You might need to preserve the password for encryption
                                //TODO:     Generate new predictible password for encryption
                                delete user.password
                                // if (false != $result = $this -> loginuser($user, false)) {
                                //     unset($user);
                                //     echo json_encode($result);
                                // } else {
                                //     unset($user);
                                //     $this -> db -> rollback();
                                //     die(json_encode(['error' => ["Could not add user!"], 'errno' => '003']));
                                // }
                                user.token = await auth.generateUserToken(user)
                                return res(user)
                            } catch (err) {
                                tranx.abort()
                                return rej(err)
                            }
                        } else {
                            tranx.abort()
                            return rej(new Error('Could not add user!'))
                        }
                    })
                }).catch(err => rej(err))
            }
        })

    }

    public loginUser(username: string, password: string, useToken: boolean = false): Promise<User> {
        let auth = this
        return new Promise<User>((res, rej) => {
            getIDB(true).then(db => {
                let tranx = db.transaction(DOCUMENTS.USERS, 'readonly')
                tranx.onerror = tranx.onabort = function (e) {
                    return rej(this.error)
                }
                let index = tranx.objectStore(DOCUMENTS.USERS).index('username')
                index.get(username).addEventListener('success', async function (e) {
                    if (this.result) {
                        let user = this.result //as User
                        let hash: Buffer = await auth.genHash(password, user.salt)

                        if (crypto.timingSafeEqual(hash, user.password)) {
                            //TODO:     Generate new predictible password for encryption
                            delete user.password
                            user.isNewUser = false
                            user.token = await auth.generateUserToken(user)
                            return res(user as User)
                        } else {
                            return rej(new Error('Password or username incorrect!'))
                        }
                    }
                    else {
                        return rej(new Error('Username not found!'))
                    }
                })
            }).catch(err => rej(err))
        })

    }

    private generateUserToken(user: User) {
        return this.createToken({
            iat: Date.now()
        }, { key: this.key.key, passphrase: this.key.pass }, {
                header: { typ: 'jwt' },
                audience: user.username,
                expiresIn: '15m',
            })
    }

    public registerSuperUser(username: string, email: string, pass: string, trackerData: IFaceData): Promise<SuperUser> {
        let auth = this
        return new Promise((res, rej) => {
            getIDB(true).then(db => {
                let tranx = db.transaction([DOCUMENTS.SUPER_USERS, DOCUMENTS.TRACKER], 'readwrite')
                tranx.onerror = tranx.onabort = function (e) {
                    return rej(this.error)
                }
                let user = new SuperUser(username)
                user.email = email
                user.isNewUser = user.isactive = user.isPrivate = true
                let store = tranx.objectStore(DOCUMENTS.SUPER_USERS)
                let index = store.index('username')
                index.get(username).addEventListener('success', async function (e) {
                    if (this.result) {
                        // User currently exists
                        return rej(new Error('User already exists!'))
                    }
                    else {
                        let salt = crypto.randomBytes(auth.saltLength)
                        user.password = await auth.genHash(pass, salt)
                        user.salt = salt
                        user.id = crypto.randomBytes(auth.saltLength).toString('hex')
                        store.add(user).addEventListener('success', async function () {
                            if (this.result) {
                                console.log(this.result)
                                //TODO:     Generate new predictible password for encryption
                                delete user.password
                                let store = tranx.objectStore(DOCUMENTS.TRACKER)
                                let trackerStoreData: ITrackerState = {
                                    faces: [],
                                    uid: user.id,
                                    username: user.username.toLowerCase()
                                }
                                if (trackerData.faces) trackerStoreData.faces.push(...trackerData.faces.map(d => d.descriptor))
                                if (trackerData.face) trackerStoreData.faces.push(trackerData.face.descriptor)
                                store.put(trackerStoreData).addEventListener('success', async function () {
                                    if (this.result) {
                                        console.log(this.result)
                                        //TODO:   
                                        res(user)
                                    } else {
                                        tranx.abort()
                                        rej(new Error('Could not complete registration!'))
                                    }
                                })
                            }
                        }
                        )
                    }
                }
                )
            }).catch(err => rej(err))
        })

    }

    public loginSuperUser(username: string, pass: string): Promise<SuperUser> {
        let auth = this
        return new Promise((res, rej) => {
            getIDB(true).then(db => {
                let tranx = db.transaction(DOCUMENTS.SUPER_USERS, 'readonly')
                tranx.onerror = tranx.onabort = function (e) {
                    return rej(this.error)
                }
                let index = tranx.objectStore(DOCUMENTS.SUPER_USERS).index('username')
                index.get(username).addEventListener('success', async function (e) {
                    if (this.result) {
                        let user = this.result //as SuperUser
                        let hash: Buffer = await auth.genHash(pass, user.salt)

                        if (crypto.timingSafeEqual(hash, user.password)) {
                            //TODO:     Generate new predictible password for encryption
                            delete user.password
                            user.isNewUser = false
                            return res(user as SuperUser)
                        } else {
                            return rej(new Error('Password or username incorrect!'))
                        }
                    }
                    else {
                        return rej(new Error('Username not found!'))
                    }
                })
            }).catch(err => rej(err))
        })

    }

    /**
     * This grants access to the application, using the administrator password.
     * The password creates a hash which is used to decrypt the previously stored private key.
     * 
     * @param pass Administrator's password
     */
    public grantApplicationAccess(pass: string): Promise<void> {
        let passwordHash: Buffer
        return new Promise((res, rej) => {
            try {
                db.getItem('.v1.admin.passwordHash', (err, val: Buffer) => {
                    if (err) throw err
                    if (!val) rej(new Error('Password has not been previously set!'))
                    passwordHash = val
                    // Read salt for administrator password verification synchronously
                    let salt = fs.readFileSync(ADMIN_SALT_1_PATH)
                    // Read salt used for encrypting private key from filesystem asynchronously
                    fs.readFile(ADMIN_SALT_2_PATH, async (err: any, salt2: any) => {
                        if (err) throw err
                        if (crypto.timingSafeEqual(Buffer.from(passwordHash), await this.genHash(pass, salt))) {
                            let passphrase: string = (await this.genHash(pass, salt2, ITERATION_NUM / 10, this.keySize / 2)).toString()
                            this.adminKey = {
                                key: fs.readFileSync(join(appPath, '.v1.privkey')),
                                pass: passphrase,
                                pubKey: fs.readFileSync(join(appPath, '.v1.pubkey'))
                            }
                            this.key = {
                                key: (this.adminKey.key as Buffer).toString(),
                                pass: passphrase,
                                pubKey: (this.adminKey.pubKey as Buffer).toString()
                            }
                            return res()
                        } else {
                            return rej(new Error('Access denied!'))
                        }
                    })
                })
            } catch (e) {
                rej(e)
            }
        })
    }

    encrypt(alg: string = 'aes-256-cbc', key?: any) {
        let iv = crypto.randomBytes(16).toString('latin1')
        let cypher = crypto.createCipheriv(alg, key, iv)
        return (data: any) => {
            return btoa(iv) + IV_SEPARATOR + cypher.update(data, null, 'base64')
        }
    }

    decrypt(data: string, alg: string = 'aes-256-cbc', key?: any) {
        let ivSepIndex = data.indexOf(IV_SEPARATOR)
        let cypher = crypto.createDecipheriv(alg, key, data.substring(0, ivSepIndex))
        return cypher.update(Buffer.from(data.substring(ivSepIndex + 1), 'base64'), 'base64', 'utf8')
    }

    createToken(payload: {}, pkey: any, options?: jsonwebtoken.SignOptions, callback?: jsonwebtoken.SignCallback): Promise<string> {
        return new Promise((res, rej) => {
            jwt.sign(payload, pkey, { algorithm: 'RS512', ...options }, callback || function (err: any, encoded: string) {
                if (err) rej(err)
                return res(encoded)
            })
        })
    }

    verifyToken(token: string, pubkey: any, callback: jsonwebtoken.VerifyCallback, opts?: jsonwebtoken.VerifyOptions) {
        return jwt.verify(token, pubkey, { algorithms: ['RS512'], ...opts }, callback)
    }

    public static async generateKeyPair(type: 'rsa' | 'dsa' | 'ec', options: {}): Promise<any> {
        console.log('geneate keypair arguments: ', arguments)
        return util.promisify(crypto.generateKeyPair)(type, options).then((res: any) => {
            console.log(`Promisified keypair generator result: `, res)
            return Promise.resolve(res)
        }).catch((e: any) => { throw e })
    }
}
