
declare type Vehicle = {
    model: string
    brand: string
    year: number
    vid: string // uniquely indexed
    user: string
    color: string
    type: any
    profile?: string;
    id: number;
    location: {
        longitude: number,
        latitude: number
    };
    timestamp: number
}

declare type Auth = any

declare type User = any