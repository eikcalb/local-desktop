import { Action } from "redux";
import ILocalStore from "../store";
import * as TYPES from "../types";

export default function reducer(state: ILocalStore, action: Action): ILocalStore {
    let newState = state
    switch (action.type) {
        case TYPES.DATABASE_READY:
            newState.databaseReady = true
            break
        case TYPES.FACE_DETECT:
            break

    }
    return newState
}