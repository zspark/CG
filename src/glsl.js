const colorCube = {
    vs: `#version 300 es
in vec3 a_position;
in vec3 a_color;
out vec3 v_color;
uniform mat4 u_vpMatrix;
void main() {
    v_color=a_color;
    gl_Position = u_vpMatrix*vec4(a_position,1.0);
}`,
    fs: `#version 300 es
precision mediump float;
//const float gammaFactor = (1.0/2.2);
//const float gammaFactor = 2.2;
in vec3 v_color;
out vec4 fragColor;
void main() {
    //fragColor = pow(vec4( v_color, 1.0), vec4(gammaFactor));
    fragColor = vec4( v_color, 1.0);
    //fragColor = vec4(1.0,0.0,0.0,1.0);
}`,
};

const gridGround = {
    vs: `#version 300 es
uniform mat4 u_mvpMatrix;
uniform mat4 u_mvMatrix;
layout(location=0) in vec3 a_position;
out float v_distanceToCamera;
void main() {
    vec4 pos=vec4(a_position,1.0);
    gl_Position = u_mvpMatrix*pos;
    v_distanceToCamera = -(u_mvMatrix*pos).z;
}`,
    fs: `#version 300 es
precision mediump float;
const float FADE_DISTANCE_BEGIN = 10.0;
const float FADE_DISTANCE_END = 30.0;
const float GRID_COLOR = 0.55;

in float v_distanceToCamera;
out vec4 fragColor;
void main() {
    float alpha=1.0 - smoothstep(FADE_DISTANCE_BEGIN, FADE_DISTANCE_END, v_distanceToCamera);
    alpha = clamp(alpha, 0.0, 1.0);
    fragColor = vec4(GRID_COLOR,GRID_COLOR,GRID_COLOR,alpha);
    //fragColor = vec4(1.0,0.0,0.0,1.0);
}`,
};

const pureRed = {
    vs: `#version 300 es
uniform mat4 u_mvpMatrix;
layout(location=0) in vec3 a_position;
void main() {
    gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}`,
    fs: `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`,
};

window.CG ??= {};
window.CG.shaderSource ??= {};
window.CG.shaderSource.colorCube = colorCube;
window.CG.shaderSource.gridGround = gridGround;
window.CG.shaderSource.pureRed = pureRed;

console.log('[glsl.js] loaded.');

