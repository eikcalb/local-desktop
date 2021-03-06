import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@material-ui/core";
import { Slider } from '@material-ui/lab';
import * as faceapi from "face-api.js";
import { FullFaceDescription, LabeledFaceDescriptors, Point, TinyFaceDetectorOptions } from "face-api.js";
import * as React from "react";
import { MdCancel, MdCheckCircle } from "react-icons/md";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { ImageCapture } from "src/mytypes";
import Message, { IMessage, notify } from "../notification";
import { DOCUMENTS, getIDB } from "../store";
import { regulateBrightness } from "./image";
import { drawCircleFromBox, getImageFromMedia, isDebug } from "./util";

const { resolve } = window.require('path')
// const { remote } = window.require('electron')
export enum Target {
    DETECT, RECOGNIZE
}

export type TrackerInputType = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement

const MODELS = resolve(`${process.env.PUBLIC_URL}/build/weights`)
const MIN_CONFIDENCE: number = 0.5;
const MIN_EUCLIDEAN_DISTANCE: number = 0.49
const MIN_VIDEO_HEIGHT: number = 52
const MIN_VIDEO_WIDTH: number = 96

/**
 * This is used to debounce video ops
 */
const IDEAL_FRAMERATE = 6


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


export class Tracker extends React.PureComponent<ITrackerProps, any>{

    private videoEl: HTMLVideoElement;
    private imageCapture: ImageCapture
    private canvasEl: HTMLCanvasElement;
    private mediaStream: MediaStream;
    private videoTrack: MediaStreamTrack
    // private useBatch: boolean = true;
    public fullFaceDescriptors: FullFaceDescription[]
    private _isRunning: boolean
    protected _cachedReferences: LabeledFaceDescriptors[]
    private result: TrackerResult
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
    // private ctx: CanvasRenderingContext2D | null;
    private timer: number
    private rafId: number
    private updateRate: number = (1000 / IDEAL_FRAMERATE)
    public boxColor: { [key: string]: string } = {
        success: '#1f1a', default: '#eeea', fail: '#f11a'
    }
    private getCanvasRef: (element: HTMLCanvasElement) => void

    //TODO:  Make this to parse directory and get faces from that directory
    // TODO:  Save face descriptor alone without pictures.

    // { [key: string]: Float32Array | any }[]
    get referenceFaces(): Promise<LabeledFaceDescriptors[]> {
        return this.__getReferenceFaces()
    }

    //*****
    protected async __getReferenceFaces(force?: boolean): Promise<LabeledFaceDescriptors[]> {
        return !force && this._cachedReferences ? this._cachedReferences : new Promise<LabeledFaceDescriptors[]>(async (res, rej) => {
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
                let lfdx = await Promise.all(data).then(userx => userx.map(user => {
                    return new LabeledFaceDescriptors(user.username, user.faces)
                }))
                res(await lfdx)
                // .then(htmlImgx => htmlImgx.map(async htmlImg => await faceapi.allFaces(await htmlImg, MIN_CONFIDENCE, _self.useBatch)[0]))
                // .then(fdx => (fdx.map((fd, i) => Object.create({ descriptor: fd, label: data[i] }))))
            }
        }).then(val => {
            this._cachedReferences = val
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
            // faceapi.loadMtcnnModel(MODELS),
            faceapi.loadTinyFaceDetectorModel(MODELS),
            faceapi.loadFaceLandmarkTinyModel(MODELS),
            faceapi.loadFaceRecognitionModel(MODELS)
        ])
        this.getCanvasRef = (el: any) => {
            if (el) {
                this.canvasEl = el
                this.setState({ ctx: this.canvasEl.getContext('2d') })
            }
        }
    }

    componentDidMount() {
        this.timer = Date.now()
        this._onload()
    }

    componentWillUnmount() {
        this.running = false
        cancelAnimationFrame(this.rafId);
        if (this.mediaStream) {
            if (this.mediaStream.stop) this.mediaStream.stop();
            this.mediaStream.oninactive = null;
        }
        if (this.videoTrack) this.videoTrack.stop()
        delete this.canvasEl
        delete this.videoEl
        delete this.videoTrack
        // this.ctx = null
    }

    canRunAlg(time: number, multiplier: number = 1): boolean {
        // console.log(Math.max(0, (time - this.timer)), '< should be greater than >', this.updateRate)
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

    // updateConstraints(constraints: MediaTrackConstraints) {
    //     this.videoTrack.applyConstraints(constraints)
    // }

    run() {
        let now: number = Date.now()
        let canRun = this.canRunAlg(now)
        // console.info(`Can start Running: ${canRun}`)

        if (this.running && canRun) {
            // console.info('Running: ')

            this.imageCapture.grabFrame().then(async image => {
                if (!this.running || !canRun) return
                if (this.state.ctx) {
                    // this.state.ctx.clearRect(0, 0, this.canvasEl.clientWidth, this.canvasEl.clientHeight)
                    this.state.ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, this.canvasEl.width, this.canvasEl.height)
                    this.state.ctx.save()
                    this._handle()
                    this.state.ctx.restore()
                }
            }).catch(err => { console.log(err) })
        }
        if (this.running) { this.rafId = requestAnimationFrame(this.run.bind(this)) }
    }

    render() {
        return (
            <Dialog className="Tracker"
                BackdropProps={{ style: { position: 'absolute' } }} container={this.props.dialogContainer}
                classes={{ root: this.props.classes.dialogRoot, scrollBody: this.props.classes.dialogBody }}
                disableBackdropClick disableEscapeKeyDown
                scroll='body' onClose={() => null} open={this.props.open}>
                <DialogTitle>Center Your Face On The Camera!</DialogTitle>
                <DialogContent style={{ overflowX: 'hidden' }} >
                    <div className="TrackerMedia">
                        <canvas className={"FineVideo"} width={this.props.videoWidth || (MIN_VIDEO_WIDTH * 6)} height={this.props.videoHeight || (MIN_VIDEO_HEIGHT * 6)}
                            id='c'
                            ref={this.getCanvasRef}
                            style={{ objectFit: 'fill', zIndex: 1 }} />
                        <BrightnessController initialLevel={100} ctx={this.state.ctx} />
                        {/* <canvas className={"FineVideo"} width={this.props.videoWidth || (MIN_VIDEO_WIDTH * 6)} height={this.props.videoHeight || (MIN_VIDEO_HEIGHT * 6)}
                            id='v' poster={logo} onPause={() => this.running = false}
                            onPlaying={() => this.running = true} onPlay={() => { this.run() }}
                            src={isDebug() ? process.env.PUBLIC_URL + '/video.example.ogg' : ''}
                            loop ref={this.getCanvasRef} autoPlay
                            style={{ objectFit: 'fill', zIndex: 1 }} /> 
                            <canvas id='c' ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'absolute', top: 0 }} /> */}
                        {/* <canvas height={416} width={768} ref={el => { if (el) { this.canvasEl = el } }} style={{ zIndex: 2, position: 'relative', bottom: '50%', left: 0 }} /> */}
                        {/* <button onClick={this._onload.bind(this)} style={{ zIndex: 4, flex: 1, alignSelf: 'center' }} >Start Tracker</button> */}
                    </div>
                    <DialogActions>
                        <Button fullWidth
                            variant={'raised'} color='primary' disabled={!this.state.success || !this.result} onClick={() => {
                                this.props.callback(this.result)
                                return;
                            }} >
                            <MdCheckCircle />&emsp; Done
                        </Button>
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
        if (!isDebug()) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    aspectRatio: 1,
                    frameRate: { ideal: IDEAL_FRAMERATE, max: 10, min: 2 },
                    height: { ideal: this.canvasEl ? this.canvasEl.clientHeight : MIN_VIDEO_HEIGHT * 6, min: MIN_VIDEO_HEIGHT * 6 },
                    width: { ideal: this.canvasEl ? this.canvasEl.clientWidth : MIN_VIDEO_WIDTH * 6, min: MIN_VIDEO_WIDTH * 6 }
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
                        this.props.notify(new Message(e.message || 'Error while registering to capture media stream!'));
                    });
        } else {
            // Delay processing, because apparently, the video element is not mounted in time for the ref callback to fire
            process.nextTick(() => setTimeout(this.registerTracker, 1500))
        }

    }

    async registerTracker(): Promise<any> {
        if (isDebug()) {
            if (!this.videoEl) {
                return Promise.reject(new Error("No video element referenced!"));
            }
            this.canvasEl.width = this.videoEl.width
            this.canvasEl.height = this.videoEl.height
        } else {
            if (!this.canvasEl) {
                this.mediaStream.stop()
                return Promise.reject(new Error("No canvas element referenced!"));
            }
            console.log('starting image capture!')
            this.imageCapture = new window.ImageCapture(this.videoTrack)
            this.running = true
        }
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
                    let result = await this.detectFaces(this.canvasEl, true)
                    if (result) {
                        this.result = new TrackerResult(true, result, 'Face captured successfully!')
                        this.setState({ success: true })
                    }
                    break;
                case Target.RECOGNIZE:
                    let faceData = await this.recognizeFaces(this.canvasEl, await this.referenceFaces, true)
                    console.log(faceData)
                    if (faceData) {
                        //  Return only the first matched face
                        this.result = new TrackerResult(true, faceData[0], 'Face recognised successfully!')
                        console.log("Recognition result: ", this.result)
                        this.setState({ success: true })
                        // setTimeout(
                        //     () => {
                        //         if (faceData) this.props.callback(new TrackerResult(true, faceData, 'Face captured successfully!'))
                        //     },
                        //     1000
                        // )
                    }

                    break;
            }
        } catch (e) {
            console.log(e)
            this.run()
        }
    }

    /**
     * This is used to save a new face for recognition. New user creation might trigger this function.
     * There should be only one person visible during detection. This will take only the first face into consideration
     * 
     * @param input Source stream to recogize from. Either an image video or canvas, video is used here
     */
    private async detectFaces(input: TrackerInputType, oneShot: boolean = true, show: boolean = true, useBatch?: boolean) {
        //TODO:  Allow user select face incase of multiple faces
        // This has been updated to use high level api
        let res = await faceapi.detectSingleFace(input, new TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: MIN_CONFIDENCE })).withFaceLandmarks(true).withFaceDescriptor();
        if (res) {
            if (show) {
                if (this.state.ctx) {
                    if (res.faceDetection) {
                        let rBox = res.faceDetection.relativeBox
                        let { clientWidth, clientHeight } = this.canvasEl
                        let lMarks = res.faceLandmarks.getMouth()
                        let leftPoint: Point = lMarks[0], rightPoint: Point = lMarks[lMarks.length - 1]
                        let verticalDisplacement = leftPoint.y - rightPoint.y
                        drawCircleFromBox(this.state.ctx, (clientWidth * rBox.x), (clientHeight * rBox.y),
                            (clientWidth * (rBox.width)), (clientHeight * (rBox.height)),
                            { strokeColor: this.boxColor.default, padding: 3 },
                            Math.abs(verticalDisplacement) > (2 * window.devicePixelRatio) ? Math.atan(verticalDisplacement / (leftPoint.x - rightPoint.x)) : 0)
                    }
                }
            }
            // if (oneShot) this.videoEl.pause()
            if (oneShot) this.running = false
            //  remove any drawing on the canvas
            this.state.ctx.restore()
            let faceCanvases = await faceapi.extractFaces(input, [res.faceDetection])
            console.log(faceCanvases)
            let image = getImageFromMedia(faceCanvases[0])
            return { face: res, image }
        }
        return null
    }


    /**
     * This is used to recognize previously saved faces
     * 
     * @param input @see TrackerInputType Video
     * @param reference @see LabeledFaceDescriptors[]
     * @param oneShot boolean. Decides if the video should be paused on first result or it should run indefinitely
     * @param show Whether to draw on the canvas, showing the face region
     * 
     * @returns Promise<IFaceData[]|null> Containing the recognized face that matches the provided @see this.props.expectedUsername
     */
    private async recognizeFaces(input: TrackerInputType, reference: LabeledFaceDescriptors[], oneShot: boolean = true, show: boolean = true, continueOnFail: boolean = true): Promise<IFaceData[] | null> {
        let fullFaceDescriptors = await faceapi.detectAllFaces(input, new TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: MIN_CONFIDENCE })).withFaceLandmarks(true).withFaceDescriptors();
        if (fullFaceDescriptors.length > 0) {
            let result = fullFaceDescriptors.reduce((prev, res) => {
                // if (res.faceDetection.score < MIN_CONFIDENCE) {
                //     return prev
                // }
                let verified = this.props.expectedUsername ? Tracker._verify(res, reference, this.props.expectedUsername) : null
                if (verified) prev.push({ ...verified, face: res })
                if (show) {
                    if (this.state.ctx) {
                        // this.state.ctx.clearRect(0, 0, this.canvasEl.clientWidth, this.canvasEl.clientHeight)
                        if (res.faceDetection) {
                            let rBox = res.faceDetection.relativeBox
                            let { clientWidth, clientHeight } = this.canvasEl
                            let lMarks = res.faceLandmarks.getMouth()
                            let leftPoint: Point = lMarks[0], rightPoint: Point = lMarks[lMarks.length - 1]
                            let verticalDisplacement = leftPoint.y - rightPoint.y
                            drawCircleFromBox(this.state.ctx, (clientWidth * rBox.x), (clientHeight * rBox.y),
                                (clientWidth * (rBox.width)), (clientHeight * (rBox.height)),
                                {
                                    strokeColor: verified ? this.boxColor.success : this.boxColor.fail,
                                    padding: 3
                                },
                                Math.abs(verticalDisplacement) > (2 * window.devicePixelRatio) ? Math.atan(verticalDisplacement / (leftPoint.x - rightPoint.x)) : 0)
                        }
                    }
                }
                return prev
            }, new Array<IFaceData>())//.sort(({ faceDetection: a }, { faceDetection: b }) => a.score > b.score ? 1 : a.score < b.score ? -1 : 0)
            if (result.length > 0) {
                // if (oneShot) this.videoEl.pause()
                if (oneShot) this.running = false
                return result
            } else {
                if (!continueOnFail) return this.cancel("User's face does not match!"); else return null
            }
        } else {
            // if (this.state.ctx) this.state.ctx.clearRect(0, 0, this.canvasEl.clientWidth, this.canvasEl.clientHeight)
        }
        return null
    }

    /**
     * 
     * @param fdx FullFaceDescriptors of faces to verify.
     * 
     * @returns Promise<{IFaceData[]}> The label is the uid of the reference face matched
     */
    // public async verify(fdx: FullFaceDescription[], faceMatcher?: FaceMatcher): Promise<IFaceData[]> {
    //     let matcher = faceMatcher || new FaceMatcher(await this.referenceFaces)
    //     return fdx.map(fd => {
    //         let faceMatch = Tracker._verify(fd, matcher)
    //         console.log(faceMatch);
    //         return { ...faceMatch, face: fd }
    //     })
    // }

    protected static _verify(fd: FullFaceDescription, ref: LabeledFaceDescriptors[], expectedLabel: string): { label: string } | false {
        // console.log(matcher)
        // let faceMatch = matcher.findBestMatch(fd.descriptor)
        let match = ref.reduce((previous, { descriptors, label }): { distance: number, label: string }[] => {
            if (label == expectedLabel) {
                let preMatch = new Array<number>()
                descriptors.forEach((descriptor) => {
                    const distance = faceapi.euclideanDistance(fd.descriptor, descriptor)
                    console.log(`Distance .euclidean for ${label}: `, MIN_EUCLIDEAN_DISTANCE >= distance, distance, preMatch)
                    if (MIN_EUCLIDEAN_DISTANCE >= distance) {
                        return preMatch.push(distance)
                    }
                    return
                })
                if (preMatch.length > 0) {
                    preMatch.sort((a, b) => a - b)
                    previous.push({ distance: preMatch[0], label })
                }
            }

            return previous
        }, new Array<{ distance: number, label: string }>()).sort((a, b) => a.distance - b.distance)[0]

        return match && match.label ? { label: match.label } : false
        // return {
        //     detection: fd.detection,
        //     label: bestMatch.label,
        //     distance: bestMatch.distance
        // }
        // return { label: faceMatch.label }
    }

}


export default connect(null, (dispatch: Dispatch, ownprops: ITrackerProps) => {
    return {
        notify: notify(dispatch)
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


export class BrightnessController extends React.Component<{ initialLevel: number, ctx: CanvasRenderingContext2D | null }, any> {
    constructor(props: any) {
        super(props)
        console.log(props)
        this.state = {
            brightnessLevel: props.initialLevel
        }
    }

    setBrightnessLevel(event: React.ChangeEvent, brightnessLevel: number) {
        this.setState({ brightnessLevel })
        console.log('set brightness to: ' + brightnessLevel)
        if (this.props.ctx) regulateBrightness(this.props.ctx, brightnessLevel)
    }


    render() {
        return (
            <Slider style={{ margin: '1em 0.5em' }} min={0} max={200} onChange={this.setBrightnessLevel.bind(this)} value={this.state.brightnessLevel} />
        )
    }
}