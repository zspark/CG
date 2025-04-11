export function warn(...args: any[]): void {
    console.warn("%c[WARN]", "color:yellow", ...args);
}
export function info(...args: any[]): void {
    console.info("%c[INFO]", "color:green", ...args);
}
export function vital(...args: any[]): void {
    console.error("%c[VITAL]", "color:red", ...args);
    throw "vital error!!";
}
export function log(...args: any[]): void {
    console.log("[LOG]", ...args);
}


export default { warn, info, vital, log };
