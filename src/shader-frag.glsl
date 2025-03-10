#version 300 es
precision mediump float;

//%%

#define PI2 6.283185307179586
#define PI 3.14159265359
#define PI_2 1.5707963267948966
#define FADE_DISTANCE_BEGIN 10.0
#define FADE_DISTANCE_END 30.0

uniform int u_uuid;
uniform float u_edgeThrottle;
uniform sampler2D u_depthTexture_r32f;
uniform sampler2D u_skybox_latlon;
uniform vec3 u_color;

in vec3 v_normal;
in vec3 v_rayDirection;
in float v_distanceToCamera;
in vec3 v_color;

#ifdef R32I
out int o_pickable;
#elif defined(R32F)
out float o_fragDepth;
#else
out vec4 o_fragColor;
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

void main() {
    float _alpha = 1.0f;
    vec3 _color = vec3(1.0);

#ifdef FADE_AWAY_FROM_CAMERA
    _alpha = 1.0 - smoothstep(FADE_DISTANCE_BEGIN, FADE_DISTANCE_END,
                              v_distanceToCamera);
#endif

#ifdef COLOR_VERTEX_ATTRIB
    _color = v_color;
#elif defined(COLOR_UNIFORM)
    _color = u_color;
#elif defined(DEBUG_NORMAL)
    _color = normalize(v_normal) * .5 + .5;
#elif defined(SKYBOX_LATLON)
    vec3 rayDir = normalize(v_rayDirection);
    float u = 0.5 + atan(rayDir.z, rayDir.x) / PI2;
    float v = 0.5 - asin(rayDir.y) / PI;
    _color = texture(u_skybox_latlon, vec2(u, v)).rgb;
#elif defined(SOBEL_SILHOUETTE)
    vec2 _textureSize =
        vec2(textureSize(u_depthTexture_r32f, 0));  // 0 means lod level;
    vec2 _texelSize = 1.0 / _textureSize;

    float _depth[9];
    int _index = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            _depth[_index] =
                texture(u_depthTexture_r32f,
                        (gl_FragCoord.xy + vec2(i, j)) * _texelSize)
                    .r;
            ++_index;
        }
    }

    // Sobel kernel. and strength.
    /*
  vertical direction:
  -1  0  1
  -2  0  2
  -1  0  1

  horizontal direction:
  -1 -2 -1
  0  0  0
  1  2  1
    */
    float _gradiantX = (-1.0 * _depth[0]) + (1.0 * _depth[2]) +
                       (-2.0 * _depth[3]) + (2.0 * _depth[5]) +
                       (-1.0 * _depth[6]) + (1.0 * _depth[8]);
    float _gradianY = (-1.0 * _depth[0]) + (-2.0 * _depth[1]) +
                      (-1.0 * _depth[2]) + (1.00 * _depth[6]) +
                      (2.0 * _depth[7]) + (1.0 * _depth[8]);
    float _edgeStrength = length(vec2(_gradiantX, _gradianY));

    if (step(u_edgeThrottle, _edgeStrength) > 0.5) {
        _color = vec3(1.0, 1.0, 0.0);
    } else
        discard;
#else
    _color = vec3(0.0, 1.0, 1.0);
#endif

#ifdef R32I
    o_pickable = u_uuid;
#elif defined(R32F)
    o_fragDepth = gl_FragCoord.z;
#else
    o_fragColor = vec4(_color, _alpha);
#endif
}
