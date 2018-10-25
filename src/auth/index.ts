import * as jwt from "jsonwebtoken";

export default class Auth{
    createKeyPair(){
        
    }

    createToken(payload:{},pkey:any,options?:{}){
        jwt.sign(payload,pkey,{algorithm:'RS512',...options})
    }
}