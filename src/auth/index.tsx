import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import * as React from "react"
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { promisify } from "util";
import { Modal, Typography, TextField } from "@material-ui/core";

const IV_SEPARATOR = '.'

export default class Auth {
    private key: Buffer | string

    constructor() {
        // this.key = process.env.LOCAL_PASSWORD
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
