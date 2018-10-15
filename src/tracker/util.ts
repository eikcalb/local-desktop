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

interface IDrawOptions {
    lineWidth?: number;
    color?: string;
}

export function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, options: IDrawOptions) {

}