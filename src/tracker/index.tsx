import * as faceapi from "face-api.js";
import { FullFaceDescription } from "face-api.js";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import logo from '../logo.svg';
import Message, { IMessage } from "../notification";
import { FACE_DETECT, FACE_DETECT_ADD, NOTIFICATION } from "../types";
import { getImageFromMedia, drawCircleFromBox } from "./util";
import { MtcnnResult } from "face-api.js/build/commonjs/mtcnn/types";

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
    play?: boolean;
    height?: number
    width?: number
}


const MODELS = `${process.env.PUBLIC_URL}/weights`;
const MIN_CONFIDENCE: number = 0.5;
const MIN_VIDEO_HEIGHT: number = 52
const MIN_VIDEO_WIDTH: number = 96

/**
 * This is used to debounce video ops
 */
const IDEAL_FRAMERATE = 6

export class Tracker extends React.PureComponent<ITrackerProps, unknown>{

    private videoEl: HTMLVideoElement;
    private canvasEl: HTMLCanvasElement;
    private mediaStream: MediaStream;
    private videoTrack: MediaStreamTrack
    private useBatch: boolean = true;
    public fullFaceDescriptors: FullFaceDescription[] | MtcnnResult[] | {}[];
    private _isRunning: boolean
    get running(): boolean {
        return this._isRunning
    }
    set running(running: boolean) {
        if (this._isRunning === running) { return }
        this._isRunning = running
        if (running) {
            this.run()
        } else {
            cancelAnimationFrame(this.rafId)
        }
    }
    private ctx: CanvasRenderingContext2D | null;
    private timer: number
    private rafId: number
    private updateRate: number = (1000 / IDEAL_FRAMERATE)
    public boxColor: { [key: string]: string } = {
        success: '#0a08', default: '#00a8', fail: '#a008'
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
        this.timer = Date.now()
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

    canRunAlg(time: number, multiplier: number = 1): boolean {
        console.log(Math.max(0, (time - this.timer)), '< should be reater than >', this.updateRate)
        if (Math.max(0, (time - this.timer)) >= (this.updateRate * multiplier)) {
            this.timer = time
            return true
        } else {
            return false
        }
    }

    getSnapshotBeforeUpdate(prevProps: ITrackerProps, PrevState: unknown): any {
        return this.props.play
    }

    componentDidUpdate(prevProps: any, PrevState: any, snapshot: boolean) {
        this.running = snapshot
    }

    updateConstraints(constraints: MediaTrackConstraints) {
        this.videoTrack.applyConstraints(constraints)
    }

    run() {
        let now: number = Date.now()
        let canRun = this.canRunAlg(now)
        console.info(`Can start Running: ${canRun}`)

        if (this.running && canRun) {
            console.info('Running: ')

            this._handle()
        } faceapi.getMediaDimensions
        if (this.running) { this.rafId = requestAnimationFrame(this.run.bind(this)) }
    }

    render() {
        return (
            <div className="Tracker">
                <video className={"b"} width={this.props.width || (MIN_VIDEO_WIDTH * 8)} height={this.props.height || (MIN_VIDEO_HEIGHT * 8)} id='v' poster={logo} autoPlay onPause={() => this.running = false} onPlaying={() => this.running = true} onLoadedMetadata={() => { this.run() }} controls={false} onLoad={this._onload} ref={(el) => { if (el !== null) { this.videoEl = el } }} style={{ objectFit: 'fill', zIndex: 1 }}>
                    <track kind={'descriptions'} srcLang={'en'} default src={`${process.env.PUBLIC_URL}/vtt/detect.vtt`} />
                </video>
                <canvas id='c' ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'relative', top: '-50%' }} />
                {/* <canvas height={416} width={768} ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'relative', bottom: '50%', left: 0 }} /> */}
                {/* <button onClick={this._onload.bind(this)} style={{ zIndex: 4, flex: 1, alignSelf: 'center' }} >Start Tracker</button> */}
            </div>
        )
    }

    async _onload() {
        // prepare models for future work
        await faceapi.loadMtcnnModel(MODELS);
        await faceapi.loadFaceDetectionModel(MODELS)
        await faceapi.loadFaceRecognitionModel(MODELS)

        console.log(this.videoEl);
        window.onmessage = (message) => { console.log(message); this.videoEl.pause() }

        navigator.mediaDevices.getUserMedia({
            video: {
                aspectRatio: 1,
                frameRate: { ideal: IDEAL_FRAMERATE, max: 10, min: 2 },
                height: { ideal: this.videoEl.clientHeight, min: MIN_VIDEO_HEIGHT * 4 },
                width: { ideal: this.videoEl.clientWidth, min: MIN_VIDEO_WIDTH * 4 }
            }
        })
            .then(
                s => {
                    // this.running = true
                    this.mediaStream = s;
                    this.mediaStream.oninactive = (stream): any => {
                        this.running = false
                    }
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
        this.canvasEl.width = this.videoEl.width
        this.canvasEl.height = this.videoEl.height
        this.ctx = this.canvasEl.getContext('2d');
    }

    private async detectFaces(input: TrackerInputType, show?: boolean, useBatch?: boolean) {
        console.log(this.videoEl.clientWidth, this.videoEl.clientHeight, this.canvasEl.clientWidth.toPrecision(4), this.canvasEl.clientHeight);

        let fullFaceDescriptors = await faceapi.mtcnn(input, { minFaceSize: 200, maxNumScales: 10 });//await faceapi.nets.mtcnn.forward(input, { minFaceSize: 200 })
        if (show) {
            fullFaceDescriptors.forEach(res => {
                if (res.faceDetection.score < MIN_CONFIDENCE) {
                    return
                }
                // res = res.forSize(this.videoEl.clientWidth, this.videoEl.clientHeight)
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.videoEl.clientWidth, this.videoEl.clientHeight)
                    if (res.faceDetection) {
                        let rBox = res.faceDetection.getRelativeBox()
                        let { clientWidth, clientHeight } = this.canvasEl
                        let lMarks = res.faceLandmarks.getPositions()
                        let verticalDisplacement = lMarks[4].y - lMarks[3].y
                        // console.log(rBox, [(clientWidth * rBox.x).toPrecision(4), (clientHeight * rBox.y).toPrecision(4), (clientWidth * rBox.width).toPrecision(4), (clientHeight * rBox.height).toPrecision(4)])
                        drawCircleFromBox(this.ctx, (clientWidth * rBox.x), (clientHeight * rBox.y),
                            (clientWidth * (rBox.width)), (clientHeight * (rBox.height)),
                            { strokeColor: this.boxColor.default, padding: 3 },
                            verticalDisplacement > (4 * window.devicePixelRatio) ? Math.atan(verticalDisplacement / (lMarks[4].x - lMarks[3].x)) : 0)
                        // faceapi.drawBox(this.ctx, (clientWidth * rBox.x), (clientHeight * rBox.y), (clientWidth * (rBox.width)), (clientHeight * (rBox.height)), faceapi.getDefaultDrawOptions({ boxColor: this.boxColor.default }))
                        // faceapi.drawDetection(this.canvasEl, res.faceDetection.forSize(this.videoEl.clientWidth, this.videoEl.clientHeight), { withScore: false, boxColor: this.boxColor.default })
                        this.videoEl.pause()
                    }
                }
                // console.log(this.videoEl.clientWidth, this.videoEl.clientHeight, res.detection.imageHeight, res.detection.getBox());

                // if (res.faceDetection) {
                //     let rBox = res.faceDetection.getRelativeBox()
                //     let { clientWidth, clientHeight } = this.canvasEl
                //     faceapi.drawBox(this.ctx, (clientWidth * rBox.x), (clientHeight * rBox.y), (clientWidth * rBox.width), (clientHeight * rBox.height), { ...faceapi.getDefaultDrawOptions(), withScore: false, boxColor: this.boxColor.default })
                //     // faceapi.drawDetection(this.canvasEl, res.faceDetection.forSize(this.videoEl.clientWidth, this.videoEl.clientHeight), { withScore: false, boxColor: this.boxColor.default })
                //     this.videoEl.pause()
                // }

                console.log(res)
            })
        }
        // return fullFaceDescriptors

        /*
                let fullFaceDescriptors = await faceapi.allFacesMtcnn(input, { minFaceSize: 180, maxNumScales: 3 }, useBatch || this.useBatch);
        
                if (show) {
                    fullFaceDescriptors.forEach(fd => {
                        fd = fd.forSize(this.videoEl.clientWidth, this.videoEl.clientHeight)
                        if (this.ctx) {
                            this.ctx.clearRect(0, 0, this.videoEl.clientWidth, this.videoEl.clientHeight)
                        }
                        console.log(this.videoEl.clientWidth, this.videoEl.clientHeight, fd.detection.imageHeight, fd.detection.getBox());
        
                        if (fd.detection) {
                            faceapi.drawDetection(this.canvasEl, fd.detection, { withScore: false, boxColor: this.boxColor.default })
                        }
                        console.log(fd)
                    })
                }
                */
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

    public async verify(fdx: any[]) {
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