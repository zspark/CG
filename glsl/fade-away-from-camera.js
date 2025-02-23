if (!CG.vital) CG.vital("log.js file should be loaded first!");
window.CG ??= {};
window.CG.shaderSource ??= {};


(function () {
    const vs = `#version 300 es
uniform mat4 u_mvpMatrix;
uniform mat4 u_mvMatrix;
layout(location=0) in vec3 a_position;
out float v_distanceToCamera;
void main() {
    vec4 pos=vec4(a_position,1.0);
    gl_Position = u_mvpMatrix*pos;
    v_distanceToCamera = -(u_mvMatrix*pos).z;
}`;




    const fs = `#version 300 es
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
}`;




    window.CG.shaderSource.fadeAwayFromCamera = { fs, vs };
    CG.info('[shader:fade-away-from-camera.js] loaded.');
})();

