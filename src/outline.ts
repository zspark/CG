import glC from "./gl-const.js";
import { geometry } from "./geometry.js"
import * as windowEvents from "./window-events.js"
import { Pipeline, SubPipeline } from "./device-resource.js";
import { createProgram } from "./program-manager.js"
import { GLFramebuffer_C0_r32f } from "./webgl.js"
import { roMat44, Mat44, Vec4 } from "./math.js"
import { IProgram, IGeometry, IRenderObject, IPipeline, ITexture, IRenderer, ISubPipeline } from "./types-interfaces.js";

const _vert = `#version 300 es
precision mediump float;
layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
uniform mat4 u_mMatrix;
layout(location = 0) in vec3 a_position;
void main(){
    vec4 pos = vec4(a_position, 1.0);
    gl_Position = u_vpMatrix * u_mMatrix * pos;
}`;

const _frag = `#version 300 es
precision mediump float;
out float o_fragDepth;
void main() {
    o_fragDepth = gl_FragCoord.z;
}`;

const _shader = [`#version 300 es
precision mediump float;
layout(location = 0) in vec3 a_position;
void main(){
    gl_Position = vec4(a_position, 1.0);
}`, `#version 300 es
precision mediump float;
uniform sampler2D u_depthTexture_r32f;
out vec4 o_fragColor;
void main() {
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

    if (step(2.0, _edgeStrength) > 0.5) {
        o_fragColor = vec4(1.0, 1.0, 0.0, 1.0);
    } else
        discard;
}`];

export type OutlineTarget_t = {
    renderObject: IRenderObject;
    modelMatrix: roMat44;
};

export interface api_IOutline {
    readonly pipelines: IPipeline[];
    setTarget(target: OutlineTarget_t): api_IOutline;
    removeAllTargets(): api_IOutline;
}

export default class Outline implements api_IOutline {

    private _frontFBOQuad: IGeometry;
    private _pipeline: IPipeline;
    private _subPipeline: ISubPipeline;
    private _fbo: GLFramebuffer_C0_r32f;
    private _backFBOPipeline: IPipeline;

    constructor() {
        this._frontFBOQuad = geometry.createFrontQuad();

        const { width, height } = windowEvents.getWindowSize();
        this._fbo = new GLFramebuffer_C0_r32f(width, height);
        this._backFBOPipeline = new Pipeline(100)
            .setFBO(this._fbo)
            .cullFace(true, glC.BACK)
            .depthTest(false, glC.LESS)
            .setProgram(createProgram(_vert, _frag))
            .validate()

        this._subPipeline = new SubPipeline()
            .setRenderObject(this._frontFBOQuad)
            .setTexture(this._fbo.colorTexture0)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_depthTexture_r32f", this._fbo.colorTexture0.textureUnit);
            });

        this._pipeline = new Pipeline(-200000)
            .setProgram(createProgram(_shader[0], _shader[1]))
            .depthTest(false/*, glC.LESS*/)
            .cullFace(false)
            .appendSubPipeline(this._subPipeline)
            .validate()

        windowEvents.onResize((w: number, h: number) => {
            this._fbo.resize(w, h);
        });
    }

    setTarget(target: OutlineTarget_t): Outline {
        this.removeAllTargets();
        this._backFBOPipeline.appendSubPipeline(
            new SubPipeline()
                .setRenderObject(target.renderObject)
                .setUniformUpdaterFn((program: IProgram) => {
                    program.uploadUniform("u_mMatrix", target.modelMatrix.data);
                })
        )
        return this;
    }

    get pipelines(): IPipeline[] {
        return [this._pipeline, this._backFBOPipeline];
    }

    removeAllTargets(): Outline {
        this._backFBOPipeline.removeSubPipelines();
        return this;
    }

    update(dt: number): void {
    }
}

