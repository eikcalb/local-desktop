export const ANDROID = "application/vnd.android.package-archive";

declare module 'crypto' {
    export function generateKeyPair(type: string, options: any, callback?: (err: any, publicKey: any, privateKey: any) => any): void
    export function generateKeyPairSync(type: string, options: any): {}
}

declare function require(arg: string): any