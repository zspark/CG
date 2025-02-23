function createCube(edgeLength) {
    const _half=edgeLength*.5;
  const vertices = new Float32Array([
    -_half, -_half, -_half, // 前下左
    _half, -_half, -_half, // 前下右
    _half, _half, -_half, // 前上右
    -_half, _half, -_half, // 前上左
    -_half, -_half, _half, // 后下左
    _half, -_half, _half, // 后下右
    _half, _half, _half, // 后上右
    -_half, _half, _half, // 后上左
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // 前面
    1, 5, 6, 1, 6, 2, // 右面
    5, 4, 7, 5, 7, 6, // 后面
    4, 0, 3, 4, 3, 7, // 左面
    3, 2, 6, 3, 6, 7, // 上面
    0, 4, 5, 0, 5, 1, // 下面
  ]);

  return {
    vertices: vertices,
    indices: indices,
  };
}

window.CG??={};
window.CG.geometry??={};
window.CG.geometry.createCube=createCube;

console.log('[geometry.js] loaded.');
