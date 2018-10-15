
export class Location {
    latitude: number;
    longitude: number;
    longitudeDelta: number = 11.5;

    latitudeDelta: number = 0.0922;

    timestamp: number = Date.now();

    constructor(longitude: number, latitude: number) {
        this.longitude = longitude || 0;
        this.latitude = latitude || 0;
        let { width, height } = { width: 375, height: 667 }// using iphone 6se screen size as reference
        this.longitudeDelta = this.latitudeDelta * (width / height);
    }

    update(longitude: number, latitude: number) {
        this.longitude = longitude;
        this.latitude = latitude;
    }
}