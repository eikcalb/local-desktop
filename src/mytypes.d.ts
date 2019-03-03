export const ANDROID = "application/vnd.android.package-archive";

declare module 'crypto' {
    export function generateKeyPair(type: string, options: any, callback?: (err: any, publicKey: any, privateKey: any) => any): void
    export function generateKeyPairSync(type: string, options: any): {}
}

declare global {
    interface Window { require: NodeRequire, process: any, ImageCapture: ImageCapture }
}
declare type ImageCapture = { new(track: MediaStreamTrack): ImageCapture, grabFrame: () => Promise<ImageBitmap> }
declare module '*.json'
