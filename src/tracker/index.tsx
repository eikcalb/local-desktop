import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@material-ui/core";
import * as faceapi from "face-api.js";
import { FaceMatcher, FullFaceDescription, LabeledFaceDescriptors, Point, TinyFaceDetectorOptions } from "face-api.js";
import * as React from "react";
import { MdCancel } from "react-icons/md";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import logo from '../logo.svg';
import Message, { IMessage } from "../notification";
import { DOCUMENTS, getIDB } from "../store";
import { NOTIFICATION } from "../types";
import { drawCircleFromBox, getImageFromMedia } from "./util";

export enum Target {
    DETECT, RECOGNIZE
}

export type TrackerInputType = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement

export interface ITrackerProps {
    track: Target;
    notify: (message: IMessage) => any;
    play?: boolean;
    videoHeight?: number
    videoWidth?: number,
    canCancel?: boolean,
    classes?: any,
    dialogContainer?: any,
    location?: any,
    open: boolean,
    expectedUsername?: string,
    callback: (result: TrackerResult) => any
}


const MODELS = `${process.env.PUBLIC_URL}/weights`;
const MIN_CONFIDENCE: number = 0.5;
const MIN_VIDEO_HEIGHT: number = 52
const MIN_VIDEO_WIDTH: number = 96

/**
 * This is used to debounce video ops
 */
const IDEAL_FRAMERATE = 6

export class Tracker extends React.PureComponent<ITrackerProps, any>{

    private videoEl: HTMLVideoElement;
    private canvasEl: HTMLCanvasElement;
    private mediaStream: MediaStream;
    private videoTrack: MediaStreamTrack
    // private useBatch: boolean = true;
    public fullFaceDescriptors: FullFaceDescription[]
    private _isRunning: boolean
    protected _cachedReferences: LabeledFaceDescriptors[]
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
        success: '#5a58', default: '#fefefe88', fail: '#a558'
    }

    //TODO:  Make this to parse directory and get faces from that directory
    // TODO:  Save face descriptor alone without pictures.

    // { [key: string]: Float32Array | any }[]
    get referenceFaces(): Promise<LabeledFaceDescriptors[]> {
        return this.__getReferenceFaces()
    }

    //*****
    protected async __getReferenceFaces(): Promise<LabeledFaceDescriptors[]> {
        return this._cachedReferences ? this._cachedReferences : new Promise<LabeledFaceDescriptors[]>(async (res, rej) => {
            // let _self = this
            let db = await getIDB()
            let tranxn = db.transaction(DOCUMENTS.TRACKER, 'readonly')
            tranxn.onerror = tranxn.onabort = function () {
                return rej(this.error)
            }
            let store = tranxn.objectStore(DOCUMENTS.TRACKER)
            store.getAll().onsuccess = async function () {
                if (!this.result || (Array.isArray(this.result) && this.result.length < 1)) {
                    console.log('Tracker list is empty!')
                    return res([])
                }
                let data = this.result as ITrackerState[]
                console.log("Stored face data", data)

                let lfdx = await Promise.all(data).then(userx => userx.map(user => {
                    return new LabeledFaceDescriptors(user.username, user.faces)
                }))
                res(await lfdx)
                // .then(htmlImgx => htmlImgx.map(async htmlImg => await faceapi.allFaces(await htmlImg, MIN_CONFIDENCE, _self.useBatch)[0]))
                // .then(fdx => (fdx.map((fd, i) => Object.create({ descriptor: fd, label: data[i] }))))
            }


        }).then(val => {
            this._cachedReferences = val
            console.log("labeled face descriptors", val)
            return val
        })
    }

    constructor(props: ITrackerProps) {
        super(props)
        this.state = {
            cancel: false,
            success: false
        }
        // prepare models for future work
        Promise.all([
            faceapi.loadMtcnnModel(MODELS),
            faceapi.loadTinyFaceDetectorModel(MODELS),
            faceapi.loadFaceLandmarkTinyModel(MODELS),
            faceapi.loadFaceRecognitionModel(MODELS)
        ])
    }

    componentDidMount() {
        this.timer = Date.now()
        this._onload()
    }

    componentWillUnmount() {
        cancelAnimationFrame(this.rafId);
        if (this.mediaStream) {
            if (this.mediaStream.stop) this.mediaStream.stop();
            this.mediaStream.oninactive = null;
        }
        if (this.videoTrack) this.videoTrack.stop()
        delete this.canvasEl
        delete this.videoEl
        delete this.videoTrack
        this.ctx = null
    }

    canRunAlg(time: number, multiplier: number = 1): boolean {
        console.log(Math.max(0, (time - this.timer)), '< should be greater than >', this.updateRate)
        if (Math.max(0, (time - this.timer)) >= (this.updateRate * multiplier)) {
            this.timer = time
            return true
        } else {
            return false
        }
    }

    cancel(reason?: string) {
        this.props.callback(
            new TrackerResult(false, { message: reason || "User cancelled facial recognition request!" })
        );
        return null
    }

    getSnapshotBeforeUpdate(prevProps: ITrackerProps, PrevState: unknown): any {
        return this.props.play
    }

    componentDidUpdate(prevProps: any, PrevState: any, snapshot: boolean) {
        this.running = snapshot
    }

    // updateConstraints(constraints: MediaTrackConstraints) {
    //     this.videoTrack.applyConstraints(constraints)
    // }

    run() {
        let now: number = Date.now()
        let canRun = this.canRunAlg(now)
        console.info(`Can start Running: ${canRun}`)

        if (this.running && canRun) {
            console.info('Running: ')

            this._handle()
        }
        if (this.running) { this.rafId = requestAnimationFrame(this.run.bind(this)) }
    }

    render() {
        return (
            <Dialog className="Tracker"
                BackdropProps={{ style: { position: 'absolute' } }} container={this.props.dialogContainer}
                // PaperProps={this.state.error ? { style: { animationName: 'shake', animationDuration: '900ms', animationFillMode: 'both', maxWidth: '30em', flex: 1 } } : { style: { maxWidth: '30em', flex: 1 } }}
                classes={{ root: this.props.classes.dialogRoot, scrollBody: this.props.classes.dialogBody }}
                disableBackdropClick disableEscapeKeyDown
                scroll='body' onClose={() => null} open={this.props.open}>
                <DialogTitle>Center Your Face On The Camera!</DialogTitle>
                <DialogContent>
                    <div className="Tracker">
                        <video className={"FineVideo"} width={this.props.videoWidth || (MIN_VIDEO_WIDTH * 6)} height={this.props.videoHeight || (MIN_VIDEO_HEIGHT * 8)}
                            id='v' poster={logo} onPause={() => this.running = false}
                            onPlaying={() => this.running = true} onPlay={() => { this.run() }}
                            autoPlay src="data:video/ogg,null"
                            controls={false} ref={(el) => { if (el) { this.videoEl = el } }}
                            style={{ objectFit: 'fill', zIndex: 1 }}>
                            <track kind={'descriptions'} srcLang={'en'} default src={`${process.env.PUBLIC_URL}/vtt/detect.vtt`} />
                        </video>
                        <canvas id='c' ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'absolute', top: 0 }} />
                        {/* <canvas height={416} width={768} ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'relative', bottom: '50%', left: 0 }} /> */}
                        {/* <button onClick={this._onload.bind(this)} style={{ zIndex: 4, flex: 1, alignSelf: 'center' }} >Start Tracker</button> */}
                    </div>
                    <DialogActions>
                        <Button fullWidth
                            variant={'raised'} color='secondary' hidden={!this.props.canCancel} onClick={() => { return this.props.callback(new TrackerResult(false, { message: "User cancelled facial recognition request!" })); }} >
                            <MdCancel />&emsp; Cancel
                        </Button>
                    </DialogActions>

                </DialogContent>
            </Dialog >
        )
    }

    /**
     * Normally, this would be called on video element load event.
     * Since this is a react c=application, prefer calling this in the component did mount event instead
     */
    async _onload() {
        console.log(this.videoEl, this.mediaStream);
        window.onmessage = (message) => { console.log(message); this.videoEl.pause() }
        navigator.mediaDevices.getUserMedia({
            video: {
                aspectRatio: 1,
                frameRate: { ideal: IDEAL_FRAMERATE, max: 10, min: 2 },
                height: { ideal: this.videoEl ? this.videoEl.clientHeight : MIN_VIDEO_HEIGHT * 9, min: MIN_VIDEO_HEIGHT * 4 },
                width: { ideal: this.videoEl ? this.videoEl.clientWidth : MIN_VIDEO_WIDTH * 9, min: MIN_VIDEO_WIDTH * 4 }
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
        try {
            switch (this.props.track) {
                case Target.DETECT:
                    // this.videoEl.pause()
                    // this.fullFaceDescriptors = await this.detectFaces(this.videoEl, true) || []
                    // if (this.fullFaceDescriptors.length > 0) {
                    //     this.props.callback(new TrackerResult(true, { faces: this.fullFaceDescriptors, message: "Detected faces!" }))
                    // }
                    let face = await this.detectFaces(this.videoEl, true)
                    if (face) {
                        this.props.callback(new TrackerResult(true, { ...face, message: 'Face captured successfully!' }))
                    }
                    break
                    break;
                case Target.RECOGNIZE:
                    let matcher = new FaceMatcher(await this.referenceFaces)

                    let faceData = await this.recognizeFaces(this.videoEl, matcher, true)
                    console.log(faceData)
                    if (faceData) {
                        this.props.callback(new TrackerResult(true, faceData, 'Face captured successfully!'))
                    }
                    break;
            }
        } catch (e) {
            console.log(e)
            this.run()
        }
    }

    async registerTracker(): Promise<any> {
        console.log(this.videoEl);

        if (!this.videoEl) {
            this.mediaStream.stop()
            return Promise.reject(new Error("No video element referenced!"));
        }

        this.videoEl.srcObject = this.mediaStream;
        this.canvasEl.width = this.videoEl.width
        this.canvasEl.height = this.videoEl.height
        this.ctx = this.canvasEl.getContext('2d');
    }


    /**
     * This is used to save a new face for recognition. New user creation might trigger this function.
     * There should be only one person visible during detection. This will take only the first face into consideration
     * 
     * @param input Source stream to recogize from 
     */
    private async detectFaces(input: TrackerInputType, oneShot: boolean = true, show: boolean = true, useBatch?: boolean) {
        //TODO:  Allow user select face incase of multiple faces
        // This has been updated to use high level api
        let res = await faceapi.detectSingleFace(input, new TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: MIN_CONFIDENCE })).withFaceLandmarks(true).withFaceDescriptor();
        if (res) {
            if (show) {
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.videoEl.clientWidth, this.videoEl.clientHeight)
                    if (res.faceDetection) {
                        let rBox = res.faceDetection.relativeBox
                        let { clientWidth, clientHeight } = this.canvasEl
                        let lMarks = res.faceLandmarks.getMouth()
                        let rightPoint: Point = lMarks[0], leftPoint: Point = lMarks[lMarks.length - 1]
                        let verticalDisplacement = leftPoint.y - rightPoint.y
                        drawCircleFromBox(this.ctx, (clientWidth * rBox.x), (clientHeight * rBox.y),
                            (clientWidth * (rBox.width)), (clientHeight * (rBox.height)),
                            { strokeColor: this.boxColor.default, padding: 3 },
                            Math.abs(verticalDisplacement) > (2 * window.devicePixelRatio) ? Math.atan(verticalDisplacement / (leftPoint.x - rightPoint.x)) : 0)
                        if (oneShot) this.videoEl.pause()
                    }
                }
            }
            console.log(res)
            let faceCanvases = await faceapi.extractFaces(input, [res.faceDetection])
            console.log(faceCanvases)
            let image = getImageFromMedia(faceCanvases[0])
            return { face: res, image }
        }
        return null
    }

    private async recognizeFaces(input: TrackerInputType, matcher: FaceMatcher, oneShot: boolean = true, show: boolean = true): Promise<IFaceData[] | null> {
        console.log(this.videoEl.clientWidth, this.videoEl.clientHeight, this.canvasEl.clientWidth.toPrecision(4), this.canvasEl.clientHeight);

        let fullFaceDescriptors = await faceapi.detectAllFaces(input, new TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: MIN_CONFIDENCE })).withFaceLandmarks(true).withFaceDescriptors();
        let faceData: IFaceData[] = new Array()
        if (fullFaceDescriptors.length > 0) {
            let result = fullFaceDescriptors.reduce((prev, res) => {
                if (res.faceDetection.score < MIN_CONFIDENCE) {
                    return prev
                }
                if (show) {
                    if (this.ctx) {
                        this.ctx.clearRect(0, 0, this.videoEl.clientWidth, this.videoEl.clientHeight)
                        if (res.faceDetection) {
                            let rBox = res.faceDetection.relativeBox
                            let { clientWidth, clientHeight } = this.canvasEl
                            let lMarks = res.faceLandmarks.getMouth()
                            let leftPoint: Point = lMarks[0], rightPoint: Point = lMarks[lMarks.length - 1]
                            let verticalDisplacement = leftPoint.y - rightPoint.y
                            drawCircleFromBox(this.ctx, (clientWidth * rBox.x), (clientHeight * rBox.y),
                                (clientWidth * (rBox.width)), (clientHeight * (rBox.height)),
                                { strokeColor: this.boxColor.default, padding: 3 },
                                Math.abs(verticalDisplacement) > (2 * window.devicePixelRatio) ? Math.atan(verticalDisplacement / (leftPoint.x - rightPoint.x)) : 0)
                            if (oneShot) this.videoEl.pause()
                        }
                    }
                }
                console.log(res)
                let verified = this._verify(res, matcher)
                if (verified.label && verified.label === this.props.expectedUsername) prev.push({ ...verified, face: res })
                return prev
            }, faceData)//.sort(({ faceDetection: a }, { faceDetection: b }) => a.score > b.score ? 1 : a.score < b.score ? -1 : 0)
            if (result.length > 0) {
                return result
            } else {
                if (oneShot) return this.cancel("User face does not match!"); else return null
            }
        }
        return null
    }

    /**
     * 
     * @param fdx FullFaceDescriptors of faces to verify.
     * 
     * @returns Promise<{label}> The label is the uid of the reference face matched
     */
    public async verify(fdx: FullFaceDescription[], faceMatcher?: FaceMatcher): Promise<IFaceData[]> {
        let matcher = faceMatcher || new FaceMatcher(await this.referenceFaces)
        return fdx.map(fd => {
            let faceMatch = this._verify(fd, matcher)
            console.log(faceMatch);
            return { ...faceMatch, face: fd }
        })
    }

    protected _verify(fd: FullFaceDescription, matcher: FaceMatcher): { label: string } {
        let faceMatch = matcher.findBestMatch(fd.descriptor)
        // let match = ref.map(({ descriptor, label }) => ({
        //     label, distance: faceapi.euclideanDistance(fd.descriptor, descriptor)
        // })
        // ).sort((a, b) => a.distance - b.distance)
        // return {
        //     detection: fd.detection,
        //     label: bestMatch.label,
        //     distance: bestMatch.distance
        // }
        return { label: faceMatch.label }
    }

}


export default connect(null, (dispatch: Dispatch, ownprops: ITrackerProps) => {
    return {
        notify: (message: IMessage) => {
            let action = { type: NOTIFICATION, body: message };
            dispatch(action);
        }
    }
})(Tracker);

export interface IFaceData {
    image?: any,
    face?: FullFaceDescription,
    message?: string | Message,
    faces?: FullFaceDescription[],
    label?: string
}

export class TrackerResult {
    public success: boolean;
    public data: IFaceData[] | IFaceData | undefined;
    public message: string

    constructor(success: boolean, data?: IFaceData | IFaceData[], message?: string) {
        this.success = success;
        this.data = data;
        if (data && !message) {
            if (Array.isArray(data)) {
                this.message = data.reduce((prev, cur) => prev + cur.message, '')
            } else if (data.message) this.message = data.message.toString()
        }
        if (message) this.message = message
    }
}

export interface ITrackerState {
    id?: number
    uid: number
    /**
     * This will become the label used for matching faces @var FullFaceDescription
     */
    username: string
    faces: Float32Array[]
}