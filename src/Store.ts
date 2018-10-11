import User from "./types/User";

export default interface ILocalStore{
    user?:User
}

export function defaultStore():ILocalStore{
    return {}
}