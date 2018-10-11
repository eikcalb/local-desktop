import { Action } from "redux";
import * as TYPES from "../types/index";

export interface ILogin extends Action<TYPES.LOGIN> {
}

export interface IFaceDetect extends Action<TYPES.FACE_DETECT> { }

export interface INotification extends Action<TYPES.NOTIFICATION>{
    
}