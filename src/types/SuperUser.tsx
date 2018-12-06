import User from "./User";

export default class SuperUser extends User {
    readonly isAdmin: boolean = true
}
