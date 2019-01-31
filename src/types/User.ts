import { FullFaceDescription } from "face-api.js";
import { DOCUMENTS, getIDB } from "src/store";
import { Location } from "./location";
import { Vehicle } from "./vehicle";

export default class User {
    id: number = -1;
    public username: string = "John Doe"
    fullname?: string;
    public email?: string;
    public faceDescriptor?: FullFaceDescription;
    password?: string | Buffer
    salt?: string | Buffer
    // useFingerprint?: boolean;
    isactive: boolean = false;
    isPrivate: true
    location?: Location;
    vehicles?: Vehicle[] = []
    profile?: string;
    token?: string;
    /**
     * Experimental feature, do not use!
     */
    isNewUser: boolean = false;
    readonly isAdmin: boolean = false
    get profileSrc(): string {
        return "data:image/png;base64," + this.profile;
    }


    constructor(username: string | User) {
        if (username && typeof username === 'object') {
            this.username = username.username;
            this.location = username.location;
            this.id = username.id;
            this.vehicles = username.vehicles;
            this.profile = username.profile;
            this.token = username.token;
        } else {
            this.username = username
        }
    }

    // login(user:User) {
    //     this.username = user.username;
    //     this.profile = user.profile;
    //     this.location = user.location;
    //     this.useFingerprint = user.useFingerprint;
    //     this.vehicles = [];
    //     this.token = user.token;
    //     this.id = user.id;
    // }

    // save(token) {
    //     if (token) {
    //         this.token = token;
    //     }
    //     AsyncStorage.setItem('user', JSON.stringify(this), err => {
    //         if (err) {
    //             console.log(err)
    //         }
    //     });
    // }


}

export class PreAuthUser extends User {
    passwordVerify?: string
}


export function getAllUsers(remove?: string): Promise<User[]> {
    return new Promise((res, rej) => {
        getIDB().then(db => {
            let tranx = db.transaction(DOCUMENTS.USERS, 'readonly')
            tranx.onerror = tranx.onabort = function (e) {
                return rej(this.error)
            }
            tranx.objectStore(DOCUMENTS.USERS).getAll().addEventListener('success', function (e) {
                if (this.result) {
                    let user = this.result as User[]
                    user = user.filter((value) => value.username !== remove)
                    return res(user)
                }
                else {
                    return rej(new Error('No User yet!'))
                }
            })
        }).catch(err => rej(err))
    })
}