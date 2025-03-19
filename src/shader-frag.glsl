#version 300 es
precision mediump float;
precision highp sampler2DShadow;

//%%

#define PI2 6.283185307179586
#define PI 3.14159265359
#define ONE_OVER_PI 0.3183098861837907
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
layout(std140) uniform u_ub_material {
    float u_roughnessFactor;
    float u_metallicFactor;
    float u_normalTextureScale;
    float u_occlusionTextureStrength;
    vec4 u_baseColorFactor;
    vec3 u_emissiveFactor;
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
uniform sampler2D u_pbrMR_metallicRoughnessTexture;
uniform int u_pbrMR_metallicRoughnessTextureIndex;

#ifdef R32I
out int o_pickable;
#elif defined(R32F)
out float o_fragDepth;
#else
out vec4 o_fragColor;
#endif

#ifdef FT_PBR
vec3 _fresnel(float ndotv, in vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - ndotv, 5.0);
}

float _geometry(float ndotv, float roughness) {
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    return ndotv / (ndotv * (1.0 - k) + k);
}

float _normalDistribution(float ndoth, float roughness) {
    float alpha = roughness * roughness;
    float alpha2 = alpha * alpha;
    float NdotH2 = ndoth * ndoth;

    float nom = alpha2;
    float denom = (NdotH2 * (alpha2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / max(denom, 0.001);  // Avoid division by zero
}
#endif

vec3 _getNormalW() {
#ifdef FT_TEX_NORMAL
    vec3 _normalW = normalize(v_normalW);
    vec3 _tangentW = normalize(v_tangentW);
    vec3 _biTangentW = normalize(cross(_normalW, _tangentW));
    mat3 _TBN = mat3(_tangentW, _biTangentW, _normalW);
    vec3 _normalTBN = texture(u_normalTexture, v_arrayUV[u_normalTextureUVIndex]).rgb * 2.0 - 1.0;
    _normalTBN.x *= u_normalTextureScale;
    _normalTBN.y *= u_normalTextureScale;
    return _TBN * normalize(_normalTBN);
#else
    return normalize(v_normalW);
#endif
}

vec2 _getMetallicAndRoughtness() {
#ifdef FT_TEX_METAL_ROUGH
    vec2 _value = texture(u_pbrMR_metallicRoughnessTexture, v_arrayUV[u_pbrMR_metallicRoughnessTextureIndex]).zy;
    return _value * vec2(u_metallicFactor, u_roughnessFactor);
#else
    return vec2(u_metallicFactor, u_roughnessFactor);
#endif
}

vec4 _getAlbedoColor() {
#ifdef FT_TEX_ALBEDO
    vec2 _coord = v_arrayUV[u_albedoTextureUVIndex];
    return texture(u_albedoTexture, _coord) * u_baseColorFactor;
#else
    return u_baseColorFactor;
#endif
}

/**
 * map depth from (0-1) to (near - far), all positive valus
uniform vec2 u_nearFarPlane;
float _linearizeDepth(float depth) {
    return (2.0 * u_nearFarPlane.x * u_nearFarPlane.y) /
           (u_nearFarPlane.y + u_nearFarPlane.x -
            (depth * 2. - 1.) * (u_nearFarPlane.y - u_nearFarPlane.x));
}
 */
float _calculateShadowFactor(in vec4 posProj) {
#ifdef FT_SHADOW
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
#else
    return 1.;
#endif
}

vec3 _getAmbient(in vec3 albedoColor) {
    return 0.5 * u_ambientColor * albedoColor;
}

vec3 _getDiffuse(float ndotl, in vec3 albedoColor, float shadowMapFactor) {
#ifdef FT_PBR
    if (ndotl <= 0.0) {
        return vec3(.0);
    } else {
        return ndotl * ONE_OVER_PI * albedoColor * u_lightColor.xyz * shadowMapFactor;
    }
#else
    if (ndotl <= 0.0) {
        return vec3(.0);
    } else {
        return ndotl * albedoColor * u_lightColor.xyz * shadowMapFactor;
    }
#endif
}

vec3 _getHighlight(float ndotl, float ndotv, float ndoth, float vdoth, float roughness, in vec3 F0, float shadowMapFactor) {
#ifdef FT_PBR
    vec3 F = _fresnel(ndotv, F0);
    // return vec3(F);
    float D = _normalDistribution(ndoth, roughness);
    // return vec3(D);
    float G = _geometry(ndotv, roughness) * _geometry(ndotl, roughness);
    // return vec3(G);
    vec3 specular = (D * F * G) / max(4.0 * ndotv * ndotl, 0.001);
    return max(specular, .0001) * shadowMapFactor;
#else
    if (ndotl <= 0.0) {
        return vec3(.0);
    } else {
        float specularIntensity = pow(ndoth, (2.0 - roughness) * 20.);
        return specularIntensity * u_lightColor.rgb * shadowMapFactor;
    }
#endif
}

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
    vec2 _metallicAndRoughness = _getMetallicAndRoughtness();
    vec4 _albedoColor = _getAlbedoColor();
    _alpha = _albedoColor.a;
    vec3 _normalW = _getNormalW();
    vec3 _lightDir = normalize(vec3(u_lInvMatrix[3][0], u_lInvMatrix[3][1], u_lInvMatrix[3][2]) - v_positionW);
    vec3 _cameraDir = normalize(vec3(u_vInvMatrix[3][0], u_vInvMatrix[3][1], u_vInvMatrix[3][2]) - v_positionW);
    vec3 _halfDir = normalize(_cameraDir + _lightDir);
    float _shadowMapFactor = _calculateShadowFactor(v_positionLProj);

    float _ndotl = max(dot(_normalW, _lightDir), 0.0);   // Normal and light direction dot product
    float _ndotv = max(dot(_normalW, _cameraDir), 0.0);  // Normal and view direction dot product
    float _ndoth = max(dot(_normalW, _halfDir), 0.0);    // Normal and halfway vector dot product
    float _vdoth = max(dot(_cameraDir, _halfDir), 0.0);  // View direction and halfway vector dot product

    vec3 _ambient = _getAmbient(_albedoColor.rgb);
    vec3 _diffuse = _getDiffuse(_ndotl, _albedoColor.rgb, _shadowMapFactor);
    vec3 _highlight = _getHighlight(
        _ndotl, _ndotv, _ndoth, _vdoth,
        _metallicAndRoughness.y,
        mix(vec3(0.04), _albedoColor.rgb, _metallicAndRoughness.x),
        _shadowMapFactor);
    _color = _ambient + _diffuse + _highlight;
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
