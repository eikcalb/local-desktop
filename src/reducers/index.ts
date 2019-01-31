import { IAction } from "../actions";
import ILocalStore from "../store";
import * as TYPES from "../types";
import Message from "../notification";

const rootWindow = nw.Window.get()

export default function reducer(state: ILocalStore, action: IAction): ILocalStore {
    console.log('action dispatched', action)
    let newState = Object.assign({}, state)
    switch (action.type) {
        case TYPES.LOGIN:
            newState.user = action.body
            newState.windowState.showAppBar = true
            newState.windowState.canToggleAppBar = true
            break
        case TYPES.REGISTER:
            break
        case TYPES.APPLICATION_TITLE_CHANGE:
            newState.title = action.body
            rootWindow.title = action.body
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
            if (!message.useNative && document.hasFocus()) {
                newState.newNotification = message
            }
            if (message.onshow) message.onshow()
            break
        case TYPES.VEHICLES_UPDATE_LIST:
            newState.vehicles = action.body
            break;
        case TYPES.USERS_UPDATE_LIST:
            newState.users = action.body
            break;
    }
    return newState
}