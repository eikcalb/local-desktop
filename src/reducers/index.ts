import { IAction } from "../actions";
import ILocalStore from "../store";
import * as TYPES from "../types";
import logo from '../logo.svg'
import Message from "../notification";

const rootWindow = nw.Window.get()

export default function reducer(state: ILocalStore, action: IAction): ILocalStore {
    let newState = Object.assign({}, state)
    switch (action.type) {
        case TYPES.LOGIN:
            newState.user = action.body
            newState.windowState.showAppBar = true
            newState.windowState.canToggleAppBar = true
            break
        case TYPES.REGISTER:
            break
        case TYPES.CLOSE_APPLICATION_WINDOW:
            newState.windowState.closed = action.body
            rootWindow.close(action.body)
            break
        case TYPES.WINDOW_CONTROL_ACTION_FULLSCREEN:
            newState.windowState.isWindowFullscreen = action.body !== undefined ? action.body : true
            break
        case TYPES.WINDOW_CONTROL_ACTION_RESTORE:
            newState.windowState.isWindowFullscreen = false
            newState.windowState.isWindowMaximized = false
            break
        case TYPES.WINDOW_CONTROL_ACTION_MAXIMIZED:
            newState.windowState.isWindowMaximized = action.body !== undefined ? action.body : true
            break
        case TYPES.WINDOW_CONTROL_ACTION_SHOWAPPBAR:
            newState.windowState.showAppBar = action.body
            break
        case TYPES.DATABASE_READY:
            newState.databaseReady = true
            break
        case TYPES.FACE_DETECT:
            break
        case TYPES.NOTIFICATION:
            let message: Message = action.body
            if (document.hasFocus()) {
                newState.newNotification = message
            } else {
                let notification;
                if (message.title) {
                    notification = new Notification(message.title, {
                        requireInteraction: false,
                        icon: logo,
                        ...message.options,
                        body: message.message
                    })
                } else {
                    notification = new Notification(message.message, message.options)
                }
                notification.onshow = () => { message.seen = true }
            }
            break
    }
    return newState
}