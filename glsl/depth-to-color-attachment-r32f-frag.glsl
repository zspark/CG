#version 300 es
precision mediump float;

out float fragDepth;

void main() {  //
    // we can inverse calculate depth to linear space, which ranged from [near,
    // far];
    fragDepth = gl_FragCoord.z;
}
