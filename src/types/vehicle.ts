import { Location } from "./location";

export class Vehicle {
    model: string;
    brand: string;
    year: number;
    vid: string // uniquely indexed
    user: string
    color: string;
    type: Types;
    profile: string;
    id: number;
    location: Location;


    constructor(id: number, location: Location) {
        this.id = id
        this.location = location
    }
}

export enum Types {
    BUS, BULLDOZER, COUPE, FORKLIFT, HATCHBACK, SEDAN, SUV, TRACTOR, TRAILER, TRUCK
}