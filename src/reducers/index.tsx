import { Action } from "redux";
import ILocalStore from "../store";
import * as TYPES from "../types";

export default function reducer(state:ILocalStore,action:Action):ILocalStore {
    switch(action.type){
        case TYPES.FACE_DETECT:
    }
    return {}
}