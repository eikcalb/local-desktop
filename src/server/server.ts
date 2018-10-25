import User from "../types/User";
import { Vehicle } from "../types/vehicle";

/**
 * This is an abstraction of the connection server.
 * Implementations will provide ways to manage data in an application specific manner.
 *  
 * 
 */
export interface IServerInterface {
    addUser(): User

    loginUser(): User

    logoutUser(): User

    getVehicles():Vehicle[]


    
    
}

// export default class Server implements IServerInterface {

// }