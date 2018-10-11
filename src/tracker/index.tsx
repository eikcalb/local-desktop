import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import * as tracking from "tracking";
import { IMessage } from "../notification";
import { FACE_DETECT, NOTIFICATION } from "../types";

export enum Target {
    FACE, OBJECT
}
export interface ITrackerProps {
    track: Target;
    // notify?: (message: IMessage) => any;
    detection: any;
}

export class Tracker extends React.PureComponent<ITrackerProps, unknown>{

    private videoEl: HTMLVideoElement | null;
    // private mediaStream: MediaStream;

    render() {
        return (
            <div className="Tracker">
                <video autoPlay controls={false} onLoad={() => this._onload()} ref={(el) => { this.videoEl = el }} style={{ flex: 1 }} />
            </div>
        )
    }

    _onload() {
        return;
        // navigator.getUserMedia({ video: true },
        //     s => {
        //         this.mediaStream = s;
        //         this.registerTracker(s);
        //     },
        //     e => {
        //         console.error(e);
        //         this.props.notify(new Message(e.message || 'Error in capturing media stream!'));
        //     });
    }

    registerTracker(stream: MediaStream) {
        this.videoEl

        var tracker = new tracking.ObjectTracker(this.props.track === Target.FACE ? 'face' : 'object');
        tracker.setInitialScale(4);
        tracker.setStepSize(2);
        tracker.setEdgesDensity(0.1);
        tracking.track(this.videoEl, tracker, { camera: true });
        tracker.on('track', (event: { [k: string]: [] }) => {
            if (event.data.length > 0) {
                console.log(event.data);
                this.props.detection(new TrackerResult(true, event.data));
            } else {
                this.props.detection(new TrackerResult(false));
            }
            // event.data.forEach(function (rect:{[k:string]: any}) {
            // });
        });
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
        }
    }
})(Tracker);

export class TrackerResult {
    public success: boolean;
    public data: [] | any;

    constructor(success: boolean, data?: []) {
        this.success = success;
        this.data = data;
    }
}