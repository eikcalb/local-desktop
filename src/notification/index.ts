import { Dispatch } from "redux";
import { NOTIFICATION } from "src/types";
import logo from '../logo.svg'


export enum Priority {
    LOW, MEDIUM, HIGH
}

export interface IMessage {
    message: string;
    priority: Priority
    useNative?: boolean
    title?: string
    onshow?: ([args]?: any) => any
}

function isIMessage(message: any): boolean {
    return typeof message === 'object' && 'message' in message && 'priority' in message
}

export default class Message implements IMessage {

    public message: string;
    public priority = Priority.LOW;
    public title: string
    public options: any
    public seen: boolean = false
    public useNative?: boolean
    public onshow?: ([args]?: any) => any


    setTitle(title: string) {
        this.title = title
        return this
    }

    constructor(message: string, title?: string) {
        this.message = message;
        if (title) this.title = title
    }

    toString() {
        return new String().concat(this.title ? `${this.title.bold()}: ` : '', this.message)
    }
}

export function notify(dispatch: Dispatch) {
    return (message: string | IMessage, title?: string, callback?: (err?: Error) => any) => {
        try {
            if (isIMessage(message)) {
                (message as Message).onshow = () => {
                    if (callback) callback()
                }
                dispatch({ type: NOTIFICATION, body: dispatchNotification(message as Message) })
            } else {
                let newMessage = new Message(message as string, title)
                newMessage.onshow = () => {
                    if (callback) callback()
                }
                dispatch({ type: NOTIFICATION, body: dispatchNotification(newMessage) })
            }
        } catch (err) {
            if (callback) callback(err)
            else throw err
        }
    }
}

/**
 * The notification mechanism is to set the notification state to display the message within the application  or create a native notification
 * 
 * @param message The notification to dispatch
 */
function dispatchNotification(message: Message) {
    //  if @see Mesage.useNative is false and the document is focused, show the notification in-app,
    //  else use the native notification mechanism
    if (!message.useNative && document.hasFocus()) {
        // newState.newNotification = message
    } else {
        let notification;
        if (message.title) {
            notification = new Notification(message.title, {
                requireInteraction: false,
                icon: logo,
                tag: 'local-desktop',
                ...message.options,
                body: message.message
            })
        } else {
            notification = new Notification(message.message, {
                requireInteraction: false,
                icon: logo,
                tag: 'local-desktop',
                ...message.options,
            })
        }
        notification.onshow = () => { message.seen = true }
    }
    return message
}