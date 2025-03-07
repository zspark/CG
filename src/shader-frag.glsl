#version 300 es
precision mediump float;

//%%

#define PI2 6.283185307179586
#define PI 3.14159265359
#define PI_2 1.5707963267948966

#ifdef NORMAL
in vec3 v_normal;
#endif

#ifdef to_linear
uniform vec2 u_nearFarPlane;
/**
 * posInScreen.xyz: [0-1];
 */
vec4 _screenBackToCamera(in vec3 posInScreen) {
    vec3 _ndc = posInScreen * 2.0 - 1.0;
    float _zC = _linearizeDepth(_ndc.z);
    vec2 _xyC = _ndc.xy / u_nearFarPlane.x * _zC;
    return vec4(_xyC, -_zC, 1.0);
}
/**
 * map depth from (0-1) to (near - far), all positive valus
 */
float _linearizeDepth(float depth) {
    return (2.0 * u_nearFarPlane.x * u_nearFarPlane.y) /
           (u_nearFarPlane.y + u_nearFarPlane.x -
            depth * (u_nearFarPlane.y - u_nearFarPlane.x));
}
vec2 _cartesianToPolar(in vec3 posW) {
    vec3 _posW_nor = normalize(posW);
    float phi = acos(_posW.y);
    float theta = atan(_posW.z / _posW.x);
}
#endif

#ifdef SKYBOX_LATLON
uniform sampler2D u_skybox_latlon;
in vec3 v_rayDirection;
#endif

#ifdef FADE_AWAY_FROM_CAMERA
    #define FADE_DISTANCE_BEGIN 10.0
    #define FADE_DISTANCE_END 30.0
    #define GRID_COLOR vec3(0.55)
in float v_distanceToCamera;
#endif

#ifdef COLOR_UNIFORM
uniform vec3 u_color;
#endif

#ifdef COLOR_VERTEX_ATTRIB
in vec3 v_color;
#endif

out vec4 fragColor;
void main() {
#ifdef COLOR_DEFAULT
    fragColor = vec4(0.0, 1.0, 1.0, 1.0);
#endif

#ifdef NORMAL
    vec3 normal = normalize(v_normal) * .5 + .5;
    fragColor = vec4(normal, 1.0);
#endif

#ifdef COLOR_UNIFORM
    fragColor = vec4(u_color, 1.0);
#endif

#ifdef COLOR_VERTEX_ATTRIB
    fragColor = vec4(v_color, 1.0);
#endif

#ifdef FADE_AWAY_FROM_CAMERA
    float alpha = 1.0 - smoothstep(FADE_DISTANCE_BEGIN, FADE_DISTANCE_END,
                                   v_distanceToCamera);
    fragColor = vec4(GRID_COLOR, alpha);
#endif

#ifdef SKYBOX_LATLON
    vec3 rayDir = normalize(v_rayDirection);
    float u = 0.5 + atan(rayDir.z, rayDir.x) / PI2;
    float v = 0.5 - asin(rayDir.y) / PI;
    vec3 envColor = texture(u_skybox_latlon, vec2(u, v)).rgb;
    fragColor = vec4(envColor, 1.0);
#endif
}
