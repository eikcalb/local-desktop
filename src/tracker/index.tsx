import * as faceapi from "face-api.js";
import { FullFaceDescription } from "face-api.js";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import Message, { IMessage } from "../notification";
import { FACE_DETECT, NOTIFICATION, FACE_DETECT_ADD } from "../types";
import { getImageFromMedia } from "./util";
import logo from '../logo.svg';

export enum Target {
    DETECT, RECOGNIZE, VERIFY
}

export type TrackerInputType = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement

interface ITrackerReference {
    label: string
    descriptor: Float32Array
}

export interface ITrackerProps {
    track: Target;
    notify: (message: IMessage) => any;
    detection: any;
    recognize: any
}

const MODELS = "/weights";
const MIN_CONFIDENCE: number = 0.5;
const BOX_COLOR: string = '#559'

export class Tracker extends React.PureComponent<ITrackerProps, unknown>{

    private videoEl: HTMLVideoElement;
    private canvasEl: HTMLCanvasElement;
    private mediaStream: MediaStream;
    private useBatch: boolean = true;
    public fullFaceDescriptors: FullFaceDescription[];
    private running: boolean = false



    //TODO:  Make this to parse directory and get faces from that directory
    // TODO:  Save face descriptor alone without pictures.

    // { [key: string]: Float32Array | any }[]
    get referenceFaces(): Promise<ITrackerReference[]> {
        return this.__getReferenceFaces()
    }

    protected async __getReferenceFaces(): Promise<ITrackerReference[]> {
        let labels: string[] = ['lord'];
        return Promise.all(labels)
            .then(async imgx => imgx.map(async img => {
                let resp = await fetch(`/faces/${img}.png`)
                return await faceapi.bufferToImage(await resp.blob())
            }))
            .then(htmlImgx => htmlImgx.map(async htmlImg => await faceapi.allFaces(await htmlImg, MIN_CONFIDENCE, this.useBatch)[0]))
            .then(fdx => (fdx.map((fd, i) => Object.create({ descriptor: fd, label: labels[i] }))))

    }

    // constructor(props:ITrackerProps){
    //     super(props)

    // }

    componentDidMount() {
        this._onload();
    }

    componentWillUnmount() {
        this.mediaStream.stop();
        this.mediaStream.oninactive = null;
    }

    run() {
        if (!this.running) {
            return
        }
        this._handle()
        requestAnimationFrame(this.run.bind(this))
    }

    render() {
        return (
            <div className="Tracker">
                <video height={416} width={768} poster={logo} autoPlay onPause={() => this.running = false} onPlaying={() => this.running = true} onPlay={() => { this.running = true; this.run.bind(this)() }} controls={false} onLoad={this._onload} ref={(el) => { if (el !== null) { this.videoEl = el } }} style={{ objectFit: 'fill', zIndex: 1 }} />
                <canvas height={416} width={768} ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'relative', bottom: '50%', left: 0 }} />
                {/* <button onClick={this._onload.bind(this)} style={{ zIndex: 4, flex: 1, alignSelf: 'center' }} >Start Tracker</button> */}
            </div>
        )
    }

    async _onload() {
        // prepare models for future work
        await faceapi.loadMtcnnModel(MODELS);
        await faceapi.loadFaceRecognitionModel(MODELS)

        console.log(this.videoEl);


        navigator.mediaDevices.getUserMedia({
            video: {
                frameRate: { ideal: 5, max: 12, min: 2 }, height: this.videoEl.height, width: this.videoEl.width
            }
        })
            .then(
                s => {
                    this.running = true
                    this.mediaStream = s;
                    this.mediaStream.oninactive = (stream): any => {
                        this.running = false
                    }
                    this.registerTracker();
                },
                e => {
                    console.error(e);
                    this.props.notify(new Message(e.message || 'Error in capturing media stream!'));
                });
    }

    protected async _handle() {
        switch (this.props.track) {
            case Target.DETECT:
                // this.videoEl.pause()
                this.fullFaceDescriptors = await this.detectFaces(this.videoEl, true);
                console.log(this.fullFaceDescriptors)
                break;
            case Target.RECOGNIZE:
                this.videoEl.pause()
                let { face, image } = await this.recognizeFaces(this.videoEl)
                let result = new TrackerResult(true, { face, image })
                this.props.recognize(result)
                this.videoEl.play()
                break;
            case Target.VERIFY:
                this.verify(this.fullFaceDescriptors)
                break
        }
    }

    async registerTracker(): Promise<any> {
        console.log(this.videoEl);

        if (!this.videoEl) {
            return Promise.reject(new Error("No video element referenced!"));
        }

        this.videoEl.srcObject = this.mediaStream;
    }

    private async detectFaces(input: TrackerInputType, show?: boolean, useBatch?: boolean) {
        console.log(this.videoEl.width, this.videoEl.height, this.canvasEl.width.toPrecision(4), this.canvasEl.height);
        // this.videoEl.pause()
        let fullFaceDescriptors = await faceapi.allFacesMtcnn(input, { minFaceSize: 200 }, useBatch || this.useBatch);

        if (show) {
            fullFaceDescriptors.forEach(fd => {
                fd = fd.forSize(this.videoEl.width, this.videoEl.height)
                if (fd.detection) {
                    faceapi.drawDetection(this.canvasEl, fd.detection, { withScore: false, boxColor: BOX_COLOR })
                }
                console.log(fd)
            })
        }
        return fullFaceDescriptors;
    }

    /**
     * This is used to save a new face for recognition. New user creation might trigger this function.
     * There should be only one person visible during detection. This will take only the first face into consideration
     * 
     * @param input Source stream to recogize from 
     */
    private async recognizeFaces(input: TrackerInputType) {
        let image = getImageFromMedia(input)
        let faces = await faceapi.allFaces(input, MIN_CONFIDENCE, this.useBatch);
        //TODO:  Allow user select face incase of multiple faces
        return { face: faces[0], image }
    }

    public async verify(fdx: FullFaceDescription[]) {
        return fdx.map(async fd => {
            const ref = await this.referenceFaces
            let match = ref.map(({ descriptor, label }) => ({
                label, distance: faceapi.euclideanDistance(fd.descriptor, descriptor)
            })
            ).sort((a, b) => a.distance - b.distance)
            console.log(match);
            let bestMatch = match[0]

            return {
                detection: fd.detection,
                label: bestMatch.label,
                distance: bestMatch.distance
            }
        })
    }

}


export default connect(null, (dispatch: Dispatch, ownprops: ITrackerProps) => {
    return {
        notify: (message: IMessage) => {
            let action = { type: NOTIFICATION, body: message };
            dispatch(action);
        },
        detection: (result: TrackerResult) => {
            let action = { type: FACE_DETECT, body: result };
            dispatch(action);
        },
        recognize: (person: TrackerResult) => {
            let action = { type: FACE_DETECT_ADD, body: person }
            dispatch(action)
        }
    }
})(Tracker);

export class TrackerResult {
    public success: boolean;
    public data: [] | any;

    constructor(success: boolean, data?: {}) {
        this.success = success;
        this.data = data;
    }
}

export class TrackerStore {
    private rootPath: string = "./faces"
    get path(): string {
        return this.rootPath
    }

    constructor() {

    }

}