import log from "./log.js"

export type mouseEventCallback = (evt: MouseEvent | WheelEvent) => void;
export type MouseEvents_t = {
    onDown: (cb: mouseEventCallback) => void;
    offDown: (cb: mouseEventCallback) => void;
    onWheel: (cb: mouseEventCallback) => void;
    offWheel: (cb: mouseEventCallback) => void;
    onUp: (cb: mouseEventCallback) => void;
    offUp: (cb: mouseEventCallback) => void;
    onMove: (cb: mouseEventCallback) => void;
    offMove: (cb: mouseEventCallback) => void;
    onDBClick: (cb: mouseEventCallback) => void;
    offDBClick: (cb: mouseEventCallback) => void;
    onClick: (cb: mouseEventCallback) => void;
    offClick: (cb: mouseEventCallback) => void;
}


export default function registMouseEvents(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) log.vital("[registMouseEvents] canvas is NOT a instance of HTMLCanvasElement!");

    const _mouseMove = (event: MouseEvent) => {
        _mapMoveCallbackFun.forEach((value, key) => {
            key(event);
        });
    };

    const _mouseClick = (event: MouseEvent) => {
        _mapClickCallbackFun.forEach((value, key) => {
            key(event);
        });
    };

    let _downTime: number = 0;
    canvas.addEventListener('mousedown', (event: MouseEvent) => {
        _downTime = Date.now();
        _mapDownCallbackFun.forEach((value, key) => {
            key(event);
        });
        canvas.addEventListener('mousemove', _mouseMove);
    });
    canvas.addEventListener('mouseup', (event: MouseEvent) => {
        canvas.removeEventListener('mousemove', _mouseMove);
        _mapUpCallbackFun.forEach((value, key) => {
            key(event);
        });
        if (Date.now() - _downTime < 200) {
            _mouseClick(event);
        }
    });
    canvas.addEventListener('dblclick', (event: MouseEvent) => {
        _mapDBClickCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    //canvas.addEventListener('contextmenu', (event: MouseEvent) => { });
    canvas.addEventListener('wheel', (event: WheelEvent) => {
        _mapWheelCallbackFun.forEach((value, key) => {
            key(event);
        });
    }, { passive: true });

    const _mapDownCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapWheelCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapUpCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapMoveCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapDBClickCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapClickCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mouseEvents: MouseEvents_t = {
        onDown: (cb: mouseEventCallback) => {
            _mapDownCallbackFun.set(cb, true);
        },
        offDown: (cb: mouseEventCallback) => {
            _mapDownCallbackFun.delete(cb);
        },
        onWheel: (cb: mouseEventCallback) => {
            _mapWheelCallbackFun.set(cb, true);
        },
        offWheel: (cb: mouseEventCallback) => {
            _mapWheelCallbackFun.delete(cb);
        },
        onUp: (cb: mouseEventCallback) => {
            _mapUpCallbackFun.set(cb, true);
        },
        offUp: (cb: mouseEventCallback) => {
            _mapUpCallbackFun.delete(cb);
        },
        onMove: (cb: mouseEventCallback) => {
            _mapMoveCallbackFun.set(cb, true);
        },
        offMove: (cb: mouseEventCallback) => {
            _mapMoveCallbackFun.delete(cb);
        },
        onDBClick: (cb: mouseEventCallback) => {
            _mapDBClickCallbackFun.set(cb, true);
        },
        offDBClick: (cb: mouseEventCallback) => {
            _mapDBClickCallbackFun.delete(cb);
        },
        onClick: (cb: mouseEventCallback) => {
            _mapClickCallbackFun.set(cb, true);
        },
        offClick: (cb: mouseEventCallback) => {
            _mapClickCallbackFun.delete(cb);
        },
    }
    return Object.freeze(_mouseEvents);
}

document.addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent the default context menu
});



