import * as faceapi from "face-api.js";
import { FullFaceDescription } from "face-api.js";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import logo from '../logo.svg';
import Message, { IMessage } from "../notification";
import { FACE_DETECT, FACE_DETECT_ADD, NOTIFICATION } from "../types";
import { getImageFromMedia } from "./util";

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
    recognize: any;
    play: boolean;
}


const MODELS = `${process.env.PUBLIC_URL}/weights`;
const MIN_CONFIDENCE: number = 0.5;
const MIN_VIDEO_HEIGHT: number = 416
const MIN_VIDEO_WIDTH: number = 768
const IDEAL_FRAMERATE = 6

export class Tracker extends React.PureComponent<ITrackerProps, unknown>{

    private videoEl: HTMLVideoElement;
    private canvasEl: HTMLCanvasElement;
    private mediaStream: MediaStream;
    private videoTrack: MediaStreamTrack
    private useBatch: boolean = true;
    public fullFaceDescriptors: FullFaceDescription[];
    private running: boolean = this.props.play
    private ctx: CanvasRenderingContext2D | null;
    private timer: number
    private rafId: number
    private resizeObserver: {}
    public boxColor: { [key: string]: string } = {
        success: '#5a5', default: '#336', fail: '#700'
    }


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
                let resp = await fetch(`${process.env.PUBLIC_URL}/faces/${img}.png`)
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
        cancelAnimationFrame(this.rafId);
        this.mediaStream.stop();
        this.mediaStream.oninactive = null;
        delete this.canvasEl
        delete this.videoEl
        delete this.videoTrack
        this.ctx = null
    }

    canRunAlg(): boolean {
        return !!this.timer;
    }

    getSnapshotBeforeUpdate(prevProps: ITrackerProps, PrevState: unknown): any {
        return this.props.play
    }

    componentDidUpdate(prevProps: any, PrevState: any, snapshot: boolean) {
        this.running = snapshot
    }

    updateConstraints() {

    }

    run() {
        if (this.running && this.canRunAlg()) {
            // this._handle()
        }
        this.rafId = requestAnimationFrame(this.run.bind(this))
    }


    render() {
        return (
            <div className="Tracker">
                <video height={'100%'} className={'FineVideo NoColor'} width={'100%'} poster={logo} autoPlay onPause={() => this.running = false} onPlaying={() => this.running = true} onLoadedMetadata={() => { this.run() }} controls={false} onLoad={this._onload} ref={(el) => { if (el !== null) { this.videoEl = el } }} style={{ objectFit: 'fill', zIndex: 1 }}>
                    <track kind={'descriptions'} srcLang={'en'} default src={`${process.env.PUBLIC_URL}/vtt/detect.vtt`} />
                </video>
                <canvas ref={el => { if (el) { this.canvasEl = el } }} style={{ height: '100%', width: '100%', zIndex: 2, position: 'absolute', top: '0', left: 0 }} />
                {/* <canvas height={416} width={768} ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'relative', bottom: '50%', left: 0 }} /> */}
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
                aspectRatio: 1,
                frameRate: { ideal: IDEAL_FRAMERATE, max: 10, min: 2 },
                height: { ideal: this.videoEl.clientHeight, min: MIN_VIDEO_HEIGHT },
                width: { ideal: this.videoEl.clientWidth, min: MIN_VIDEO_WIDTH }
            }
        })
            .then(
                s => {
                    // this.running = true
                    this.mediaStream = s;
                    this.mediaStream.oninactive = (stream): any => {
                        this.running = false
                    }
                    this.resizeObserver = new ResizeObserver((entries: [], observer: any) => {
                        if (entries.find(val => this.videoEl === val)) {

                        }
                    })
                    this.videoTrack = this.mediaStream.getVideoTracks()[0];
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
        this.ctx = this.canvasEl.getContext('2d');
    }

    private async detectFaces(input: TrackerInputType, show?: boolean, useBatch?: boolean) {
        console.log(this.videoEl.width, this.videoEl.height, this.canvasEl.width.toPrecision(4), this.canvasEl.height);
        // this.videoEl.pause()
        let fullFaceDescriptors = await faceapi.allFacesMtcnn(input, { minFaceSize: 200 }, useBatch || this.useBatch);

        if (show) {
            fullFaceDescriptors.forEach(fd => {
                fd = fd.forSize(this.videoEl.clientWidth, this.videoEl.clientHeight)
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvasEl.clientWidth, this.canvasEl.clientHeight)
                }
                if (fd.detection) {
                    faceapi.drawDetection(this.canvasEl, fd.detection, { withScore: false, boxColor: this.boxColor.default })
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
    private rootPath: string = `${process.env.PUBLIC_URL}/faces`
    get path(): string {
        return this.rootPath
    }

    constructor() {

    }

}