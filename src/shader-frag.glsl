#version 300 es
precision mediump float;
precision highp sampler2DShadow;

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

layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
layout(std140) uniform u_ub_light {
    mat4 u_lInvMatrix;
    mat4 u_lMatrix;
    mat4 u_lpMatrix;
    vec3 u_ambientColor;
    vec4 u_lightColor;  // w: u_specularHighlight;
};

in vec3 v_normal_debug;
in vec3 v_rayDirection;
in float v_distanceToCamera;
in vec3 v_color;
in vec3 v_positionW;
in vec3 v_normalW;
in vec3 v_tangentW;

uniform sampler2DShadow u_shadowMap;
in vec4 v_positionLProj;

in vec2 v_arrayUV[5];
uniform sampler2D u_normalTexture;
uniform int u_normalTextureUVIndex;
uniform sampler2D u_albedoTexture;
uniform int u_albedoTextureUVIndex;

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
vec4 _screenBackToCamera(in vec3 posInScreen) {
    vec3 _ndc = posInScreen * 2.0 - 1.0;
    float _zC = _linearizeDepth(_ndc.z);
    vec2 _xyC = _ndc.xy / u_nearFarPlane.x * _zC;
    return vec4(_xyC, -_zC, 1.0);
}
vec2 _cartesianToPolar(in vec3 posW) {
    vec3 _posW_nor = normalize(posW);
    float phi = acos(_posW.y);
    float theta = atan(_posW.z / _posW.x);
}
 */
#endif

vec3 _getNormalW() {
#ifdef FT_TEX_NORMAL
    vec3 _normalW = normalize(v_normalW);
    vec3 _tangentW = normalize(v_tangentW);
    vec3 _biTangentW = normalize(cross(_normalW, _tangentW));
    mat3 _TBN = mat3(_tangentW, _biTangentW, _normalW);
    vec3 _normalTBN = normalize(texture(u_normalTexture, v_arrayUV[u_normalTextureUVIndex]).rgb * 2.0 - 1.0);
    return _TBN * _normalTBN;
#else
    return normalize(v_normalW);
#endif
}

#ifdef FT_SHADOW
/**
 * map depth from (0-1) to (near - far), all positive valus
float _linearizeDepth(float depth) {
    const vec2 u_nearFarPlane = vec2(1.0, 100.0);
    return (2.0 * u_nearFarPlane.x * u_nearFarPlane.y) /
           (u_nearFarPlane.y + u_nearFarPlane.x -
            (depth * 2. - 1.) * (u_nearFarPlane.y - u_nearFarPlane.x));
}
 */
float _calculateShadowFactor(in vec4 posProj) {
    vec3 _pos = posProj.xyz / posProj.w;
    _pos = _pos * .5 + .5;
    _pos.z -= 0.005;

    float shadow = 0.0;
    float samples = 3.0;
    float offset = 0.002;  // Small offset for sampling nearby texels

    for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
            vec3 sampleCoord = _pos + vec3(x * offset, y * offset, 0.0);
            shadow += texture(u_shadowMap, sampleCoord);
        }
    }

    return shadow / (samples * samples);
}
#endif

#ifdef FT_PHONG
vec3 _phong(vec3 normalW) {
    #ifdef FT_SHADOW
    float _shadowMapFactor = _calculateShadowFactor(v_positionLProj);
    #endif

    vec3 _lightPosW = vec3(u_lInvMatrix[3][0], u_lInvMatrix[3][1], u_lInvMatrix[3][2]);
    vec3 _lightDir = normalize(_lightPosW - v_positionW);
    vec2 coord = v_arrayUV[u_albedoTextureUVIndex];
    vec3 _albedoColor = texture(u_albedoTexture, coord).rgb;
    float _lDn = dot(_lightDir, normalW);
    if (_lDn <= 0.0) {
        return 0.5 * u_ambientColor * _albedoColor;
    } else {
        vec3 _cameraDir = normalize(vec3(u_vInvMatrix[3][0], u_vInvMatrix[3][1], u_vInvMatrix[3][2]) - v_positionW);
        vec3 _halfDir = (_cameraDir + _lightDir) * .5;
        float diffuseIntensity = clamp(_lDn, 0.0, 1.0);
        float specularIntensity = pow(clamp(dot(_halfDir, normalW), 0.0, 1.0), u_lightColor.w);
        return 0.5 * u_ambientColor * _albedoColor +
               1.0 * diffuseIntensity * _albedoColor * u_lightColor.xyz * _shadowMapFactor +
               1.0 * specularIntensity * u_lightColor.xyz * _shadowMapFactor;
    }
}
#endif

void main() {
    vec3 _color = vec3(1.0);
    float _alpha = 1.0f;

#ifdef FN_FADE_AWAY_FROM_CAMERA
    _alpha = 1.0 - smoothstep(FADE_DISTANCE_BEGIN, FADE_DISTANCE_END, v_distanceToCamera);
#endif

#ifdef COLOR_VERTEX_ATTRIB
    _color = v_color;
#elif defined(COLOR_UNIFORM)
    _color = u_color;
#elif defined(DEBUG_NORMAL)
    _color = normalize(v_normal_debug) * .5 + .5;
#elif defined(FN_SKYBOX_LATLON)
    vec3 rayDir = normalize(v_rayDirection);
    float u = 0.5 + atan(rayDir.z, rayDir.x) / PI2;
    float v = 0.5 - asin(rayDir.y) / PI;
    _color = texture(u_skybox_latlon, vec2(u, v)).rgb;
#elif defined(FN_SOBEL_SILHOUETTE)
    vec2 _textureSize = vec2(textureSize(u_depthTexture_r32f, 0));  // 0 means lod level;
    vec2 _texelSize = 1.0 / _textureSize;

    float _depth[9];
    int _index = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            _depth[_index] = texture(u_depthTexture_r32f, (gl_FragCoord.xy + vec2(i, j)) * _texelSize).r;
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
#elif defined(FN_GLTF)
    #ifdef FT_PHONG
    vec3 _normalW = _getNormalW();
    _color = _phong(_normalW);
    #else
    vec2 coord = v_arrayUV[u_albedoTextureUVIndex];
    _color = texture(u_albedoTexture, coord).rgb;
    #endif
#endif

#ifdef R32I
    o_pickable = u_uuid;
#elif defined(R32F)
    o_fragDepth = gl_FragCoord.z;
#elif defined(NO_OUTPUT)
#else
    o_fragColor = vec4(_color, _alpha);
#endif
}
