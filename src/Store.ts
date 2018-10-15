import User from "./types/User";
import { TrackerStore } from "./tracker";

export default interface ILocalStore {
    user?: User,
    tracker?: TrackerStore
}

export function defaultStore(): ILocalStore {
    return {}
}