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

export function drawCircleFromBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, options: IDrawOptions) {
    ctx.save()
    ctx.lineWidth = options.lineWidth || 2
    ctx.strokeStyle = options.strokeColor || "#ffff6"
    let ellipse = new Path2D()
    ellipse.ellipse(x + (w / 2), (y + (h / 2)) - (0.05 * h), (w / 2) + (options.padding || 0), (h / 1.6) + (options.padding || 0), 0, 0, toRadians(360))
    ctx.stroke(ellipse)
    ctx.restore()
}