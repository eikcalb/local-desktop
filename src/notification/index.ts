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

    constructor(message: string) {
        this.message = message;
    }
}