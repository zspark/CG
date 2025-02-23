function createCube(edgeLength) {
    const _half = edgeLength * .5;
    const vertices = new Float32Array([
        -_half, -_half, _half, // 前下左 0
        _half, -_half, _half, // 前下右 1
        _half, _half, _half, // 前上右 2
        -_half, _half, _half, // 前上左 3
        -_half, -_half, -_half, // 后下左 4
        _half, -_half, -_half, // 后下右 5
        _half, _half, -_half, // 后上右 6
        -_half, _half, -_half, // 后上左 7
    ]);

    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3, // 前面
        0xFFFF,
        1, 5, 6, 1, 6, 2, // 右面
        0xFFFF,
        5, 4, 7, 5, 7, 6, // 后面
        0xFFFF,
        4, 0, 3, 4, 3, 7, // 左面
        0xFFFF,
        3, 2, 6, 3, 6, 7, // 上面
        0xFFFF,
        0, 4, 5, 0, 5, 1, // 下面
    ]);

    const colors = new Uint8Array([
        255, 0, 0,//0
        0, 255, 0,//1
        0, 0, 255,//2
        255, 255, 255,//3
        0, 0, 255,//4
        255, 255, 255,//5
        255, 0, 0,//6
        0, 255, 0,//7
    ]);

    return {
        vertices: vertices,
        indices: indices,
        colors: colors,
    };
}

function createPlane(width, height) {
    return {
        vertices: new Float32Array([
            width, height, 0,
            -width, height, 0,
            -width, -height, 0,
            width, -height, 0,
        ]),
        indices: new Uint16Array([
            0, 1, 2,
            2, 3, 0
        ]),
        colors: new Uint8Array([
            /*
            255, 0, 0,
            0, 255, 0,
            0, 0, 255,
            255, 255, 255,
            */
            255, 255, 255,
            0, 0, 0,
            0, 0, 0,
            255, 255, 255,
        ])
    }
}

function createTriangle() {
    return {
        vertices: new Float32Array([
            0.7, -0.3, 0,
            0, 0.7, 0,
            -0.7, -0.3, 0,
        ]),
        indices: new Uint16Array([
            0, 1, 2,
        ]),
        colors: new Uint8Array([
            255, 0, 0,
            0, 255, 0,
            0, 0, 255,
        ])
    }
}

function createGridPlane_lines(quaterSize, step = 1) {
    const vertices = [];

    let _start = -Math.floor(quaterSize / step) * step;
    for (let t = _start; t <= quaterSize; t += step) {
        vertices.push(
            t, 0, -quaterSize,
            t, 0, quaterSize,
            -quaterSize, 0, t,
            quaterSize, 0, t
        );
    }

    return {
        vertices: new Float32Array(vertices),
    };
}

window.CG ??= {};
window.CG.geometry = Object.freeze({
    createCube,
    createPlane,
    createTriangle,
    createGridPlane_lines,
});

console.log('[geometry.js] loaded.');


