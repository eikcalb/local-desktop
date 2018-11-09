import * as jwt from "jsonwebtoken";
import * as React from "react"
//TODO:  Remove this c and replae declarations with crypto constant defined below
import * as c from 'crypto'
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { promisify } from "util";
import { Modal, Typography, TextField } from "@material-ui/core";
import { writeFile, writeFileSync } from "fs";
import { appPath } from "../startup";
import { join } from "path";
const crypto = window.require('crypto')

const IV_SEPARATOR = '.'
const ITERATION_NUM = 64000 * 8// The number of iterations should double from `64000` every 2 years period from 2012
// const ROOT_PASSWORD='LAGBAJA'

export default class Auth {
    private key: Buffer | string
    private salt: Buffer | string
    private adminKey: Buffer | string
    public adminSalt: Buffer | string
    private digest: string = 'sha512'
    private keySize: number = 124
    private saltLength: number = 48

    constructor() {
        // this.key = process.env.LOCAL_PASSWORD
    }

    genAdminKey(key: string) {
        let salt = crypto.randomBytes(this.saltLength)
        try {
            this.adminKey = this.genKey(key, salt)
            this.adminSalt = salt;
            writeFileSync(join(appPath, '.v1.admin.salt'), salt)
            return { salt: this.adminSalt, key: this.adminKey }
        } catch (e) {
            return false
        }
    }

    genUserKey(key: string) {
        let salt = crypto.randomBytes(this.saltLength)
        try {
            this.key = this.genKey(key, salt)
            this.salt = salt;

            return { salt: this.salt, key: this.key }
        } catch (e) {
            return false
        }
    }

    private genKey(key: string, salt: any) {
        let newKey = crypto.pbkdf2Sync(key, salt, ITERATION_NUM, this.keySize, this.digest)

        console.log(`Successfully created new password! KeySize: ${this.keySize}, Digest: ${this.digest}`, crypto, c)
        return newKey
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
        return promisify<any, any, any>(crypto.generateKeyPair)(type, options).then(res => {
            return Promise.resolve(res)
        }).catch(e => { throw e })
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
