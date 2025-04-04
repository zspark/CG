//@ts-ignore
import log from "../../dist/log.js";

self.onmessage = (event) => {
    const WIDTH = event.data.width;
    const HEIGHT = event.data.height;
    const canvas = event.data.canvas;
    const gl = canvas.getContext("webgl2");
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const program = createProgram(gl);
    //const uLocTexture = gl.getUniformLocation(program, "u_texture");
    //const uLocLod = gl.getUniformLocation(program, "u_lod");

    const z = 0;
    const vertices = new Float32Array([
        1, 1, z,
        -1, 1, z,
        -1, -1, z,
        //
        -1, -1, z,
        1, -1, z,
        1, 1, z,
    ]);
    const VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    ///gl.viewport(0, 0, WIDTH, HEIGHT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 18);

    log.log("done");
};

function compileProgram(gl: WebGL2RenderingContext, v: string, f: string): WebGLProgram {
    function compileShader(gl: WebGL2RenderingContext, source: string, type: GLenum) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("[thread]", gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
    let vertexShader = compileShader(gl, v, gl.VERTEX_SHADER);
    let fragmentShader = compileShader(gl, f, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    return program;
}

function createProgram(gl: WebGL2RenderingContext) {
    const vertexShaderSource = `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_position;
void main() {
    gl_Position = vec4(a_position, 1.0);
}`;

    const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 o_fragColor;
void main() {
    vec2 uv = gl_FragCoord.xy / vec2(512.0, 256.0);
    o_fragColor = vec4(uv,0.0,1.);
}`;

    return compileProgram(gl, vertexShaderSource, fragmentShaderSource);
}

