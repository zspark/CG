#version 300 es
precision mediump float;
precision highp sampler2DShadow;
precision highp sampler3D;
#define SHADER_NAME pbr
//%%

#define INDEX_NORMAL 0
#define INDEX_OCCLUSION 1
#define INDEX_EMISSIVE 2
#define INDEX_BASE_COLOR 3
#define INDEX_METALLIC_ROUGHNESS 4

#define PI2 6.283185307179586
#define PI 3.14159265359
#define ONE_OVER_PI 0.3183098861837907
#define PI_2 1.5707963267948966
#define DIELECTRIC_SPECULAR 0.04

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
    vec4 u_lightColor;  // w: intensity;
};
layout(std140) uniform u_ub_material {
    float u_roughnessFactor;
    float u_metallicFactor;
    float u_normalTextureScale;
    float u_occlusionTextureStrength;
    vec4 u_baseColorFactor;
    vec3 u_emissiveFactor;
};
#ifdef CUBE
uniform samplerCube u_irradianceTexture;
uniform samplerCube u_prefilteredTexture;
#else
uniform sampler2D u_irradianceTexture;
uniform sampler3D u_prefilteredTexture;
#endif
uniform sampler2DShadow u_shadowMap;
uniform sampler2D u_brdfLutTexture;
uniform sampler2D u_pbrTextures[5];
uniform int u_pbrTextureCoordIndex[5];

#ifdef DEBUG
    #define DBG_INDEX_NORMAL 0
    #define DBG_INDEX_OCCLUSION 1
    #define DBG_INDEX_EMISSIVE 2
    #define DBG_INDEX_BASE_COLOR 3
    #define DBG_INDEX_METALLIC 4
    #define DBG_INDEX_ROUGHNESS 5
    #define DBG_INDEX_F0 6

    #define DBG_COLOR_AMBIENT 0
    #define DBG_COLOR_SPECULAR 1
uniform int u_textureDebug;
uniform int u_colorDebug;
#endif

in vec3 v_normal;
in vec3 v_positionW;
in vec3 v_normalW;
in vec3 v_tangentW;
in vec3 v_color;
in vec4 v_positionLProj;
in vec2 v_arrayUV[5];

out vec4 o_fragColor;

vec3 _fresnel(float ndotv, const in vec3 F0, float roughness) {
    // return F0 + (1.0 - F0) * pow(1.0 - ndotv, 5.0);
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - ndotv, 5.0);
}

float _geometry(float ndotv, float roughness) {
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    // float k = (roughness) * (roughness) / 2.0;
    return ndotv / (ndotv * (1.0 - k) + k);
}

float G_Smith(float roughness, float ndotv, float ndotl) {
    return _geometry(ndotv, roughness) * _geometry(ndotl, roughness);
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

vec3 _getNormalW() {
    vec3 _normalW = normalize(v_normalW);
    if (length(v_tangentW) <= .9) {
        return _normalW;
    }

    vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_NORMAL]];
    vec3 _tbn = texture(u_pbrTextures[INDEX_NORMAL], _uv).rgb * 2.0 - 1.0;
    _tbn.x *= u_normalTextureScale;
    _tbn.y *= u_normalTextureScale;
    vec3 _tangentW = normalize(v_tangentW);
    vec3 _biTangentW = normalize(cross(_normalW, _tangentW));
    return normalize(_tangentW * _tbn.x + _biTangentW * _tbn.y + _normalW * _tbn.z);
}

vec2 _getMetallicAndRoughtness() {
    vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
    vec2 _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).zy;
    return _value * vec2(u_metallicFactor, u_roughnessFactor);
}

vec4 _getBaseColor() {
    vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_BASE_COLOR]];
    return texture(u_pbrTextures[INDEX_BASE_COLOR], _uv) * u_baseColorFactor;
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
float _calculateShadowFactor(const in vec4 posProj) {
#ifdef FT_SHADOW
    vec3 _pos = posProj.xyz / posProj.w;
    _pos = _pos * .5 + .5;
    _pos.z -= 0.005;

    float shadow = 0.0;
    float samples = 9.0;
    float offset = 0.002;  // Small offset for sampling nearby texels

    for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
            vec3 sampleCoord = _pos + vec3(x * offset, y * offset, 0.0);
            shadow += texture(u_shadowMap, sampleCoord);
        }
    }

    return shadow / samples;
#else
    return 1.;
#endif
}

vec3 _textureColor(const in vec3 dir, samplerCube s, float roughness) {
    return textureLod(s, dir, roughness * 4.).rgb;
}
const vec2 invAtan = vec2(0.15915494309189535, 0.3183098861837907);
vec3 _textureColor(const in vec3 dir, sampler3D s, float roughness) {
    // atan(y,x): (-PI  , PI  );
    // atan(y/x): (-PI/2, PI/2);
    // acos(v)  : (0    , 2PI );
    vec2 uv = vec2(atan(dir.z, dir.x), acos(dir.y));
    uv *= invAtan;
    if (uv.x < 0.) {
        uv.x = 1. + uv.x;
    }
    return texture(s, vec3(uv, roughness)).rgb;
}
vec3 _textureColor(const in vec3 dir, sampler2D s) {
    vec2 uv = vec2(atan(dir.z, dir.x), acos(dir.y));
    uv *= invAtan;
    if (uv.x < 0.) {
        uv.x = 1. + uv.x;
    }
    return texture(s, uv).rgb;
}

vec3 _getIBLDiffuse(const in vec4 baseColor, const in vec3 r, float metalness) {
    vec3 _diffuseColor = baseColor.rgb * (1.0 - DIELECTRIC_SPECULAR) * (1.0 - metalness);
    vec3 _irradianceColor = _textureColor(r, u_irradianceTexture);
    return _diffuseColor * _irradianceColor;
}

vec3 _getIBLSpecular(const in vec4 baseColor, const in vec3 r, const in vec3 F0, float roughness, float ndotv) {
    // return F0;
    vec3 _prefilteredColor = _textureColor(r, u_prefilteredTexture, roughness);
    // return _prefilteredColor;
    vec2 _lut = texture(u_brdfLutTexture, vec2(ndotv, roughness)).xy;
    // return vec3(_lut, 0.);
    return _prefilteredColor * (F0 * _lut.x + _lut.y);
}

vec3 _getDiffuse(float ndotl, const in vec3 albedoColor, const in vec3 F, float shadowMapFactor) {
    if (ndotl <= 0.0) {
        return vec3(.0);
    } else {
        return ndotl * ONE_OVER_PI * albedoColor * u_lightColor.xyz * u_lightColor.w * shadowMapFactor * (1.0 - F);
    }
}

vec3 _getHighlight(float ndotl, float ndotv, float ndoth, float vdoth, float roughness, const in vec3 F, float shadowMapFactor) {
    // return vec3(F);
    float D = _normalDistribution(ndoth, roughness);
    // return vec3(D);
    float G = G_Smith(roughness, ndotv, ndotl);
    // return vec3(G);
    vec3 specular = (D * F * G) / max(4.0 * ndotv * ndotl, 0.001);
    return max(specular, .0001) * u_lightColor.rgb * u_lightColor.w * shadowMapFactor;
}

void main() {
    vec2 _metallicAndRoughness = _getMetallicAndRoughtness();
    vec4 _baseColor = _getBaseColor();
    vec3 _normalW = _getNormalW();
    // o_fragColor = vec4(_normalW, 1.);
    // return;
    vec3 _lightDir = normalize(vec3(u_lInvMatrix[3][0], u_lInvMatrix[3][1], u_lInvMatrix[3][2]) - v_positionW);
    vec3 _viewDir = normalize(vec3(u_vInvMatrix[3][0], u_vInvMatrix[3][1], u_vInvMatrix[3][2]) - v_positionW);
    vec3 _viewRefDir = reflect(-_viewDir, _normalW);
    vec3 _halfDir = normalize(_viewDir + _lightDir);
    float _shadowMapFactor = _calculateShadowFactor(v_positionLProj);

    float _ndotv = max(dot(_normalW, _viewDir), 0.0);
    vec3 _F0 = mix(vec3(DIELECTRIC_SPECULAR), _baseColor.rgb, _metallicAndRoughness.x);
    vec3 _F = _fresnel(_ndotv, _F0, _metallicAndRoughness.y);
    // o_fragColor = vec4(_F, 1.);
    // return;
    vec3 _iblDiffuse = _getIBLDiffuse(_baseColor, _viewRefDir, _metallicAndRoughness.x);
    // o_fragColor = vec4(_iblDiffuse, 1.);
    // return;
    vec3 _iblSpecular = _getIBLSpecular(_baseColor, _viewRefDir, _F0, _metallicAndRoughness.y, _ndotv);
    // o_fragColor = vec4(_iblSpecular, 1.);
    // return;

    float _ndotl = max(dot(_normalW, _lightDir), 0.0);
    float _ndoth = max(dot(_normalW, _halfDir), 0.0);
    float _vdoth = max(dot(_viewDir, _halfDir), 0.0);
    vec3 _directDiffuse = _getDiffuse(_ndotl, _baseColor.rgb, _F, _shadowMapFactor);
    vec3 _directSpecular = _getHighlight(
        _ndotl, _ndotv, _ndoth, _vdoth,
        _metallicAndRoughness.y,
        _F,
        _shadowMapFactor);
    vec3 _color = _iblDiffuse + _iblSpecular + _directDiffuse + _directSpecular;
    float _alpha = _baseColor.a;

#ifdef DEBUG
    if (u_colorDebug == DBG_COLOR_AMBIENT) {
        _color = _iblDiffuse + _directDiffuse;
    } else if (u_colorDebug == DBG_COLOR_SPECULAR) {
        _color = _iblSpecular + _directSpecular;
    }

    if (u_textureDebug == DBG_INDEX_NORMAL) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_NORMAL]];
        vec4 _normalTBN = texture(u_pbrTextures[INDEX_NORMAL], _uv);
        _color = _normalTBN.rgb;
        _alpha = 1.;
    } else if (u_textureDebug == DBG_INDEX_OCCLUSION) {
    } else if (u_textureDebug == DBG_INDEX_EMISSIVE) {
    } else if (u_textureDebug == DBG_INDEX_BASE_COLOR) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_BASE_COLOR]];
        vec4 _value = texture(u_pbrTextures[INDEX_BASE_COLOR], _uv);
        _color = _value.rgb;
        _alpha = _value.a;
    } else if (u_textureDebug == DBG_INDEX_METALLIC) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
        float _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).z;
        _color = vec3(_value);
        _alpha = 1.;
    } else if (u_textureDebug == DBG_INDEX_ROUGHNESS) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
        float _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).y;
        _color = vec3(_value);
        _alpha = 1.;
    } else if (u_textureDebug == DBG_INDEX_F0) {
        vec2 _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_BASE_COLOR]];
        vec4 _baseColor = texture(u_pbrTextures[INDEX_BASE_COLOR], _uv);
        _uv = v_arrayUV[u_pbrTextureCoordIndex[INDEX_METALLIC_ROUGHNESS]];
        float _value = texture(u_pbrTextures[INDEX_METALLIC_ROUGHNESS], _uv).z;
        _color = mix(vec3(DIELECTRIC_SPECULAR), _baseColor.rgb, _value);
        _alpha = 1.;
    }
#endif

#ifdef GAMMA_CORRECT
    const float gammaFactor = (1.0 / 2.2);
    _color = pow(_color, vec3(gammaFactor));
#endif

    o_fragColor = vec4(_color, _alpha);
}
