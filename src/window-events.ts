import log from "./log.js"

export type resizeEventCallback = (width: number, height: number) => void;

const _mapResizeCallbackFn = new Map<resizeEventCallback, boolean>();// cb->true;
window.addEventListener("resize", resizeCanvas);
function resizeCanvas(event: Event) {
    _mapResizeCallbackFn.forEach((value, fn) => {
        fn(window.innerWidth, window.innerHeight);
    });
}

export function onResize(cb: resizeEventCallback) {
    _mapResizeCallbackFn.set(cb, true);
}

export function offResize(cb: resizeEventCallback) {
    _mapResizeCallbackFn.delete(cb);
}

export function getWindowSize(): { width: number, height: number } {
    return { width: window.innerWidth, height: window.innerHeight };
}

