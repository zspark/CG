import log from "./log.js"

export type mouseEventCallback = (evt: MouseEvent | WheelEvent) => void;
export type mouseEvents = {
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
}


export default function registMouseEvents(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) log.vital("[registMouseEvents] canvas is NOT a instance of HTMLCanvasElement!");

    canvas.addEventListener('mousemove', (event: MouseEvent) => {
        //eventInfo.textContent = `Mouse Move: X=${event.clientX}, Y=${event.clientY}`;
        _mapMoveCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('mousedown', (event: MouseEvent) => {
        //eventInfo.textContent = `Mouse Down: Button=${event.button}`;
        //window.style.backgroundColor = 'yellow';
        _mapDownCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('mouseup', (event: MouseEvent) => {
        //eventInfo.textContent = `Mouse Up: Button=${event.button}`;
        //window.style.backgroundColor = 'lightblue';
        _mapUpCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('click', (event: MouseEvent) => {
        //eventInfo.textContent = `Click: X=${event.clientX}, Y=${event.clientY}`;
    });
    canvas.addEventListener('dblclick', (event: MouseEvent) => {
        //eventInfo.textContent = `Double Click: X=${event.clientX}, Y=${event.clientY}`;
        _mapDBClickCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('contextmenu', (event: MouseEvent) => {
        //event.preventDefault(); // Prevents the default context menu
        //eventInfo.textContent = "Right Click (Context Menu)";
    });
    canvas.addEventListener('wheel', (event: WheelEvent) => {
        //event.preventDefault(); // Prevent default sc
        _mapWheelCallbackFun.forEach((value, key) => {
            key(event);
        });
    }, { passive: true });

    const _mapDownCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapWheelCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapUpCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapMoveCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mapDBClickCallbackFun = new Map<mouseEventCallback, boolean>();// cb->true;
    const _mouseEvents: mouseEvents = {
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
    }
    return Object.freeze(_mouseEvents);
}

document.addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent the default context menu
});



