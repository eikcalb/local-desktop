import { Action, AnyAction } from "redux";
import * as TYPES from "../types/index";

export interface IAction extends AnyAction {
    body?: any
}


export interface IWindowControl extends Action<TYPES.WINDOW_CONTROL_ACTION_FULLSCREEN | TYPES.WINDOW_CONTROL_ACTION_MAXIMIZED | TYPES.WINDOW_CONTROL_ACTION_SHOWAPPBAR> {

}

export interface ILogin extends Action<TYPES.LOGIN> {
}

export interface IFaceDetect extends Action<TYPES.FACE_DETECT> { }

export interface INotification extends Action<TYPES.NOTIFICATION> {

}