import { TrackerInputType } from ".";

export function getImageFromMedia(input: TrackerInputType): string {
    if (!isCanvas(input)) {
        let canvas: HTMLCanvasElement = document.createElement('canvas')
        let ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
        if (ctx) {
            ctx.drawImage(input, 0, 0, input.width, input.height)
            return canvas.toDataURL()
        }
        throw new Error('Cannot create canvas context!')

    } else {
        return (<HTMLCanvasElement>input).toDataURL()
    }
}

function isCanvas(input: TrackerInputType) {
    return (<HTMLCanvasElement>input).getContext !== undefined
}

function toRadians(degrees: number) {
    return Math.PI * (degrees / 180)
}

interface IDrawOptions {
    lineWidth?: number;
    strokeColor?: string;
    padding?: number
}

export function drawCircleFromBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, options: IDrawOptions, rotation?: number) {
    ctx.save()
    ctx.lineWidth = (options.lineWidth || 2) * window.devicePixelRatio
    ctx.strokeStyle = options.strokeColor || "#fff6"
    let ellipse = new Path2D()
    console.log(rotation)
    ellipse.ellipse((x + (w / 2)) * window.devicePixelRatio, ((y + (h / 2)) - (0.05 * h)) * window.devicePixelRatio, ((w / 2) + (options.padding || 0)) * window.devicePixelRatio, ((h / 1.6) + (options.padding || 0)) * window.devicePixelRatio, rotation || 0, 0, toRadians(360), false)
    ctx.stroke(ellipse)
    ctx.restore()
}


export function debounce(func: (...props: any[]) => any, duration = 250, immediate = false) {
    let timeout: any;
    return function () {
        //@ts-ignore
        let context = this, args = arguments;
        let later = function () {
            console.log(context);
            timeout = undefined;
            if (!immediate) func.apply(context, args);
        };
        let callnow = immediate && !timeout
        clearTimeout(timeout);
        timeout = setTimeout(later, duration);
        if (callnow) func.apply(context, args);
    }
}

export function isDebug() {
    return false || process.env['testing'] == '25'
}