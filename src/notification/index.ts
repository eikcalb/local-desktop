export enum Priority {
    LOW, MEDIUM, HIGH
}

export interface IMessage {
    message: string;
    priority: Priority
}

export default class Message implements IMessage {

    public message: string;
    public priority = Priority.LOW;
    public title: string
    public options: any
    public seen: boolean = false

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