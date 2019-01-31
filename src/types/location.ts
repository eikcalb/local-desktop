
export class Location {
    latitude: number;
    longitude: number;
    longitudeDelta: number = 11.5;

    latitudeDelta: number = 0.0922;

    timestamp: number = Date.now();

    constructor(longitude: number, latitude: number) {
        this.longitude = longitude || 0;
        this.latitude = latitude || 0;
    }

    update(longitude: number, latitude: number) {
        this.longitude = longitude;
        this.latitude = latitude;
    }
}