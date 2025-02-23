function registMouseEvents(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) CG.vital("[mouse-action] canvas is NOT a instance of HTMLCanvasElement!");

    canvas.addEventListener('mousemove', (event) => {
        //eventInfo.textContent = `Mouse Move: X=${event.clientX}, Y=${event.clientY}`;
        _mapMoveCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('mousedown', (event) => {
        //eventInfo.textContent = `Mouse Down: Button=${event.button}`;
        //window.style.backgroundColor = 'yellow';
        _mapDownCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('mouseup', (event) => {
        //eventInfo.textContent = `Mouse Up: Button=${event.button}`;
        //window.style.backgroundColor = 'lightblue';
        _mapUpCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('click', (event) => {
        //eventInfo.textContent = `Click: X=${event.clientX}, Y=${event.clientY}`;
    });
    canvas.addEventListener('dblclick', (event) => {
        //eventInfo.textContent = `Double Click: X=${event.clientX}, Y=${event.clientY}`;
        _mapDBClickCallbackFun.forEach((value, key) => {
            key(event);
        });
    });
    canvas.addEventListener('contextmenu', (event) => {
        //event.preventDefault(); // Prevents the default context menu
        //eventInfo.textContent = "Right Click (Context Menu)";
    });
    canvas.addEventListener('wheel', (event) => {
        //event.preventDefault(); // Prevent default sc
        _mapWheelCallbackFun.forEach((value, key) => {
            key(event);
        });
    });

    const _mapDownCallbackFun = new Map();// cb->true;
    const _mapWheelCallbackFun = new Map();// cb->true;
    const _mapUpCallbackFun = new Map();// cb->true;
    const _mapMoveCallbackFun = new Map();// cb->true;
    const _mapDBClickCallbackFun = new Map();// cb->true;
    const _mouseEvents = {
        onDown: (cb) => {
            _mapDownCallbackFun.set(cb, true);
        },
        offDown: (cb) => {
            _mapDownCallbackFun.delete(cb);
        },
        onWheel: (cb) => {
            _mapWheelCallbackFun.set(cb, true);
        },
        offWheel: (cb) => {
            _mapWheelCallbackFun.delete(cb);
        },
        onUp: (cb) => {
            _mapUpCallbackFun.set(cb, true);
        },
        offUp: (cb) => {
            _mapUpCallbackFun.delete(cb);
        },
        onMove: (cb) => {
            _mapMoveCallbackFun.set(cb, true);
        },
        offMove: (cb) => {
            _mapMoveCallbackFun.delete(cb);
        },
        onDBClick: (cb) => {
            _mapDBClickCallbackFun.set(cb, true);
        },
        offDBClick: (cb) => {
            _mapDBClickCallbackFun.delete(cb);
        },
    }
    return Object.freeze(_mouseEvents);
}

document.addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent the default context menu
});
window.CG ??= {};
window.CG.registMouseEvents = registMouseEvents;

console.log('[mouse-events.js] loaded.');
