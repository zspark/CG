function createGlContext(canvasElementId){
    const canvas = document.getElementById(canvasElementId);
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        CG.vital("WebGL 2.0 not supported!");
    }
    return {gl,canvas};
}
function createProgramWrapper(gl, vsSource, fsSource) {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vsSource);
  gl.compileShader(vertexShader);

  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    CG.vital("Vertex shader compilation failed:", gl.getShaderInfoLog(vertexShader));
    gl.deleteShader(vertexShader);
    return null;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fsSource);
  gl.compileShader(fragmentShader);

  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    CG.vital("Fragment shader compilation failed:", gl.getShaderInfoLog(fragmentShader));
    gl.deleteShader(fragmentShader);
    return null;
  }

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    CG.vital("Shader program linking failed:", gl.getProgramInfoLog(shaderProgram));
    gl.deleteProgram(shaderProgram);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

    const bindAttribute=(name,size,type,normalized=false,stride=0,offset=0)=>{
        const _loc = gl.getAttribLocation(shaderProgram, name);
        gl.enableVertexAttribArray(_loc);
        gl.vertexAttribPointer(_loc, size, type, normalized, stride, offset);
    };
    const deleteProgram=()=>{
        gl.deleteProgram(shaderProgram);
    };
    const useProgram=()=>{
        gl.useProgram(shaderProgram);
    };

    return Object.freeze({
        shaderProgram,
        bindAttribute,
        useProgram,
        deleteProgram,
    });
}

window.CG??={};
window.CG.createProgramWrapper=createProgramWrapper;
window.CG.createGlContext=createGlContext;

console.log('[gl.js] loaded.');
