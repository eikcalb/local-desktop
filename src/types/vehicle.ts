import { Location } from "./location";

export class Vehicle {
    model: string;
    brand: string;
    year: number;
    vid: string
    color: string;
    type: string;
    profile: string;
    id: number;
    location: Location;


    constructor(id: number, location: Location) {
        this.id = id
        this.location = location
    }
}