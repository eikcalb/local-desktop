import { pbkdf2Sync } from "crypto";
import { readFileSync } from "fs";
import { sign } from "jsonwebtoken";
import { join } from "path";

const SALT = readFileSync(join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default", '.v1.admin.salt2'))
const PRIVATE_KEY = readFileSync(join("C:/Users/WENDY EZENWA/AppData/Local/local-desktop/User Data/Default/.app", '.v1.privkey'))
export function signToken(password: string, payload: object, algorithm?: string) {
    try {
        const STORED_HASH = pbkdf2Sync(password, SALT, 64000, 62, 'SHA512')
        console.info('Starting signer with hash: ', STORED_HASH, '\n Using private key: ', PRIVATE_KEY)
        let res = sign(payload, { passphrase: STORED_HASH.toString(), key: PRIVATE_KEY.toString() }, { algorithm: algorithm || 'RS512' })
        console.log("Generated payload is: ", res)
    } catch (err) {
        console.error(err)
    }
}