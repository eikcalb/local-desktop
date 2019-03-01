import * as React from "react";
import { FaBus, FaCar, FaTractor, FaTruck } from "react-icons/fa";
import { DOCUMENTS, getIDB } from "src/store";
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
    timestamp: number


    constructor(id: number, location: Location) {
        this.id = id
        this.location = location
    }

    static getComponentForType(type: Types) {
        switch (type) {
            case Types.FORKLIFT:
            case Types.TRAILER:
            case Types.TRUCK:
                return <FaTruck />

            case Types.SUV:
            case Types.BUS:
                return <FaBus />

            case Types.COUPE:
            case Types.HATCHBACK:
            case Types.SEDAN:
                return <FaCar />

            case Types.BULLDOZER:
            case Types.TRACTOR:
                return <FaTractor />
            default:
                return <FaCar />
        }
    }
}

export enum Types {
    BUS, BULLDOZER, COUPE, FORKLIFT, HATCHBACK, SEDAN, SUV, TRACTOR, TRAILER, TRUCK
}

export function getAllVehicles(remove?: string): Promise<Vehicle[]> {
    return new Promise((res, rej) => {
        getIDB().then(db => {
            let tranx = db.transaction(DOCUMENTS.VEHICLES, 'readonly')
            tranx.onerror = tranx.onabort = function (e) {
                return rej(this.error)
            }
            tranx.objectStore(DOCUMENTS.VEHICLES).getAll().addEventListener('success', function (e) {
                if (this.result) {
                    let user = this.result as Vehicle[]
                    user = user.filter((value) => value.vid !== remove)
                    return res(user)
                }
                else {
                    return rej(new Error('No vehicle registered yet!'))
                }
            })
        }).catch(err => rej(err))
    })

}