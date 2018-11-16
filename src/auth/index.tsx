import { Modal, TextField, Typography } from "@material-ui/core";
//TODO:  Remove this c and replae declarations with crypto constant defined below
import * as jwt from "jsonwebtoken";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { db } from "../store";
import { appPath } from "../startup";
const crypto = window.require('crypto')
const fs = window.require('fs')
const { join } = window.require('path')
const util = window.require('util')

const IV_SEPARATOR = '.'
const ITERATION_NUM = 64000 * 8// The number of iterations should double from `64000` every 2 years period from 2012
export const ADMIN_SALT_1_PATH = join(nw.App.dataPath, '.v1.admin.salt')
export const ADMIN_SALT_2_PATH = join(nw.App.dataPath, '.v1.admin.salt2')
// const ROOT_PASSWORD='LAGBAJA'

export default class Auth {
    private key: Buffer | string
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
            let hash = await this.genKey(key, salt)
            let hash2 = await this.genKey(salt, salt2, ITERATION_NUM / 10, this.keySize / 2)
            fs.writeFileSync(ADMIN_SALT_1_PATH, salt)
            fs.writeFileSync(ADMIN_SALT_2_PATH, salt2)
            db.setItem('.v1.admin.passwordHash', hash, (err) => {
                if (err) throw err
            })
            // HASH2 should be utf8 encoded to prevent errors while creatig keypair
            return Promise.resolve({ salt: salt2, key: hash2.toString('utf8') })
        } catch (e) {
            console.log(e, `salt1: ${salt}`, `salt2: ${salt2}`)
            return Promise.reject(false)
        }
    }

    async genUserKey(key: string): Promise<{ key: string | Buffer, salt: string | Buffer } | false> {
        let salt = crypto.randomBytes(this.saltLength)
        try {
            let hash = await this.genKey(key, salt)
            return Promise.resolve({ salt, key: hash })
        } catch (e) {
            return Promise.reject(false)
        }
    }

    private genKey(key: string | Buffer, salt: Buffer | string, iteration: number = ITERATION_NUM, size: number = this.keySize): Promise<Buffer> {
        return new Promise((res) => {
            let newKey = crypto.pbkdf2Sync(key, salt, iteration, size, this.digest)
            return res(newKey)
        })
    }

    public grantApplicationAccess(pass: string): Promise<unknown> {
        let passwordHash: string
        return new Promise((res, rej) => {
            try {
                db.getItem('.v1.admin.passwordHash', (err, val) => {
                    if (err) throw err
                    passwordHash = val as string
                    let salt = fs.readFileSync(ADMIN_SALT_1_PATH)
                    fs.readFile(ADMIN_SALT_2_PATH, async (err: any, salt2: any) => {
                        if (err) throw err
                        if (crypto.timingSafeEqual(Buffer.from(passwordHash), await this.genKey(pass, salt))) {
                            this.adminKey = { key: fs.readFileSync(join(appPath, '.v1.privkey')), pass: (await this.genKey(pass, salt2, ITERATION_NUM / 10, this.keySize / 2)).toString('utf8'), pubKey: fs.readFileSync(join(appPath, '.v1.pubkey')) }
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
        let cypher = crypto.createCipheriv(alg, key || this.key, iv)
        return (data: any) => {
            return btoa(iv) + IV_SEPARATOR + cypher.update(data, null, 'base64')
        }
    }

    decrypt(data: string, alg: string = 'aes-256-cbc', key?: any) {
        let ivSepIndex = data.indexOf(IV_SEPARATOR)
        let cypher = crypto.createDecipheriv(alg, key || this.key, data.substring(0, ivSepIndex))
        return cypher.update(Buffer.from(data.substring(ivSepIndex + 1), 'base64'), 'base64', 'utf8')
    }

    createToken(payload: {}, pkey: any, options?: {}): string {
        return jwt.sign(payload, pkey, { algorithm: 'RS512', ...options })
    }

    verifyToken(token: string, pubkey: any, opts?: {}) {
        return jwt.verify(token, pubkey, { algorithms: ['RS512'], ...opts })
    }

    public static async generateKeyPair(type: 'rsa' | 'dsa' | 'ec', options: {}): Promise<any> {
        console.log('geneate keypair arguments: ', arguments)
        return util.promisify(crypto.generateKeyPair)(type, options).then((res: any) => {
            console.log(`Promisified keypair generator result: `, res)
            return Promise.resolve(res)
        }).catch((e: any) => { throw e })
    }
}


const mapStateToProps = (stateProps: any, ownProps: any) => { }

const mapDispatchToProps = (dispatch: Dispatch, ownProps: any) => { }

export const AdminLogon = (props: any) => {
    return (
        <Modal disableBackdropClick disableEscapeKeyDown open={props.open} >
            <div>
                <Typography variant='h3' >Welcome to Local</Typography>
                <Typography variant='subtitle2'>You <b>must</b> create an Administrator password to continue</Typography>
                <TextField required type='password' variant='filled' />
            </div>
        </Modal>
    )
}

export const AuthView = connect(mapStateToProps, mapDispatchToProps)(class extends React.Component<any, any>{

}
)
