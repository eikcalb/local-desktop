
/**
 * This is an abstraction of the connection server.
 * Implementations will provide ways to manage data in an application specific manner.
 *  
 * 
 */
export interface IServerInterface {
    addUser(username: string, password: string, passwordVerify: string): Promise<Response>

    loginUser(username: string, token: string): Promise<Response>

    logoutUser(username: string): Promise<Response>


    /**
     * Fetches all vehicles registered on the platform or for a particular user.
     * 
     * @param user username of vehicle owner to retrieve
     * @param batch starting point and amount of records to fetch
     */
    getVehicles(user?: string, batch?: { limit: number, count: number }): Promise<Response>
}

// export default class Server implements IServerInterface {

// }
export class Response<T=any> {
    public message = 'Successful'
    public data: T

    constructor(data?: any | any[]) {
        this.data = data
    }
}

export class ErrorResponse {
    public error: string[]
    public errno: number

    constructor(errno: number, error: string[] | string) {
        this.errno = errno
        this.error = (Array.isArray(error) ? error : [error]) || ['Error Occurred!']
    }
}

export const SERVER_STAT_TYPES = {
    SERVER_NEW_USER: 'SERVER_NEW_USER',
    SERVER_NEW_VEHICLE: 'SERVER_NEW_VEHICLE',
    SERVER_NEW_WORKER: 'SERVER_NEW_WORKER',
    SERVER_KILL_WORKER: 'SERVER_KILL_WORKER',
    SERVER_DELETE_VEHICLE: 'SERVER_DELETE_VEHICLE',
    SERVER_UPDATE_VEHICLE: 'SERVER_UPDATE_VEHICLE'
}
