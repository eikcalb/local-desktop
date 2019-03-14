import { IpcRenderer } from "electron";
import { divIcon, LatLng, LatLngExpression, LayerGroup, layerGroup, Map, map, marker, Marker, tileLayer } from "leaflet";
import 'leaflet/dist/leaflet.css';
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SERVER_STAT_TYPES } from ".";
import { Vehicle } from "./types/vehicle";


export default class LocalMap extends React.PureComponent<{ style?: any, emitter: IpcRenderer, vehicles: Vehicle[], center?: LatLng }> {
    private map: Map
    private layerGroup: LayerGroup
    private markers: { [key: string]: Marker } = {}

    constructor(props: any) {
        super(props)
        this.layerGroup = layerGroup()
        this.props.emitter.on(SERVER_STAT_TYPES.SERVER_UPDATE_VEHICLE, this.handleLocationChange)
    }

    handleLocationChange(...args: any[]) {

    }

    componentDidMount() {
        this.map = map('map', {
            attributionControl: false,
            center: this.props.center || [6.4437378, 3.4246347],
            zoom: 16,
            layers: [
                tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                    attribution: 'Local Desktop | <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                })
            ]
        })
        this.layerGroup.addTo(this.map)
        this.inflateMap()
    }


    getSnapshotBeforeUpdate(prevProps: any, PrevState: unknown): any {
        if (this.props.vehicles !== prevProps.vehicles) {
            this.inflateMap()
        }
    }


    // componentDidUpdate(prevProps: any, PrevState: any, snapshot: boolean) {
    //     this.running = snapshot
    // }


    render() {
        return (
            <div className='LocalMap' id='map' {...this.props}></div>
        )
    }

    addMarker(position: LatLngExpression, icon: React.ReactElement<any>, title?: string, options?: any) {
        if (title && this.markers[title]) {
            return this.markers[title].setLatLng(position)
        }
        let newMarker = marker(position, {
            riseOnHover: true,
            //@ts-ignore
            icon: divIcon({
                html: renderToStaticMarkup(icon),
                className: 'leafletDivIcon',
                iconSize: ['auto', 'auto']
            }),
            riseOffset: 300,
            clickable: true,
            ...options
        })
        if (title) this.markers[title] = newMarker

        if (this.map) {
            newMarker.addTo(this.map)
        }
        return newMarker
    }

    inflateMap() {
        this.props.vehicles.forEach(({ vid, timestamp, color, brand, model, year, type, user, location: { latitude, longitude } }) => {
            this.addMarker([latitude, longitude], Vehicle.getComponentForType(type), vid)
                .bindPopup(`<b>${vid}</b>: ${color} ${brand} ${model} (${year}) owned by ${user}`)
                .bindTooltip(`Last updated time: ${timestamp ? new Date(timestamp).toISOString() : 'never'}`)
        })
    }
}