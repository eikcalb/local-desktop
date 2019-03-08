

/**
 * Calculates the luminousity of a pixel using its color values as parameters
 * 
 * @param r red pixel value
 * @param g greed pixel value
 * @param b blue pixel value
 * @returns luminousity value between 0 and 255
 */
export function getPixelLuminousity(r: number, g: number, b: number) {
    return 0.21 * r + 0.72 * g + 0.07 * b;
}

export function getBrightnessLevel(image: ImageData): Promise<number> {

    return new Promise((res, rej) => {
        let sumBrightness: number = 0
        let { data, height, width } = image
        for (let x = 0; x < data.length; x += 4) {
            sumBrightness += getPixelLuminousity(data[x], data[x + 1], data[x + 2])
        }
        return res(sumBrightness / (width * height))
    })
}

export function regulateBrightness(ctx: CanvasRenderingContext2D, expectedBrightness: number) {

    ctx.filter = `brightness(${expectedBrightness}%)`
}