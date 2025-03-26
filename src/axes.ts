import glC from "./gl-const.js";
import engineC from "./engine-const.js";
import OrthogonalSpace from "./orthogonal-space.js"
import AABB from "./aabb.js"
import { DrawArraysInstancedParameter, geometry } from "./geometry.js"
import { createProgram } from "./program-manager.js"
import { roMat44, Mat44, Vec4 } from "./math.js";
import { Buffer, Pipeline, SubPipeline, Framebuffer } from "./device-resource.js";
import { IPipeline, IProgram, IFramebuffer, IGeometry, IRenderer, ShaderLocation_e, StepMode_e } from "./types-interfaces.js";
import { IEventDispatcher, Event_t, IEventListener } from "./event.js";

const _vert = `#version 300 es
precision mediump float;
layout(std140) uniform u_ub_camera {
    mat4 u_vInvMatrix;
    mat4 u_vMatrix;
    mat4 u_pMatrix;
    mat4 u_pInvMatrix;
    mat4 u_vpMatrix;
};
layout(location = 0) in vec3 a_position;
layout(location = 3) in vec3 a_color;
layout(location = 12) in vec4 a_instanceMatrix_col0;
layout(location = 13) in vec4 a_instanceMatrix_col1;
layout(location = 14) in vec4 a_instanceMatrix_col2;
layout(location = 15) in vec4 a_instanceMatrix_col3;
out vec3 v_color;
void main(){
    vec4 pos = vec4(a_position, 1.0);
    v_color = a_color;
    mat4 _instanceMatrix = mat4(
        a_instanceMatrix_col0, a_instanceMatrix_col1,
        a_instanceMatrix_col2, a_instanceMatrix_col3);
    gl_Position = u_vpMatrix * _instanceMatrix * pos;
}`;

const _frag = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 o_fragColor;
void main() {
    o_fragColor = vec4(v_color, 1.);
}`;

export interface IAxesTarget extends IEventDispatcher {
    readonly modelMatrix: roMat44;
    readonly parentModelMatrix: roMat44;
    readonly aabb: AABB;
};

export enum AxesMode_e {
    CENTER = 1,
    SELF = 2,
    PARENT = 3,
}

export default class Axes implements IEventListener {

    private _hpMat4 = new Mat44();

    private _targetMatricesDirty = false;
    private _arrRefTarget: IAxesTarget[] = [];
    private _instanceMatrices: Float32Array<ArrayBufferLike>;
    private _instanceMatricesHandler: Mat44;
    private _drawCmd: DrawArraysInstancedParameter = {
        mode: glC.LINES,
        first: 0,
        count: 30,
        instanceCount: 1
    };

    private _mode = AxesMode_e.CENTER;
    private _instanceMatricesBuffer = new Buffer();
    private _geometry: IGeometry;
    private _pipeline: IPipeline;

    constructor(fbo?: IFramebuffer) {
        this._instanceMatrices = new Float32Array(engineC.MAX_AXES_INSTANCE_COUNT * 16);
        this._instanceMatricesHandler = new Mat44(this._instanceMatrices, 0).copyFrom(Mat44.IdentityMat44);
        this._instanceMatricesBuffer.updateData(this._instanceMatrices, glC.DYNAMIC_DRAW)
        const _geometry = this._geometry = geometry.createAxes(2);
        for (let i = 0; i < 4; ++i) {
            _geometry.addAttribute({
                buffer: this._instanceMatricesBuffer,
                shaderLocation: ShaderLocation_e.ATTRIB_INSTANCED_MATRIX_COL_1 + i,
                size: 4,
                type: glC.FLOAT,
                normalized: false,
                stride: 64,
                offset: 16 * i,
                stepMode: StepMode_e.instance,
            })
        }
        _geometry.setDrawArraysInstancedParameters(this._drawCmd.mode, this._drawCmd.first, this._drawCmd.count, this._drawCmd.instanceCount)

        const _subp = new SubPipeline().setRenderObject(_geometry)

        this._pipeline = new Pipeline(-1000)
            .setFBO(fbo)
            .setProgram(createProgram(_vert, _frag))
            .appendSubPipeline(_subp)
            .depthTest(false/*, glC.LESS*/)
            .validate();

    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    update(dt: number): void {
        if (this._targetMatricesDirty) {
            const _m = this._instanceMatricesHandler;
            const N = this._arrRefTarget.length;
            for (let i = 0; i < N; ++i) {
                _m.remap(this._instanceMatrices, 16 * (i + 1));
                switch (this._mode) {
                    case AxesMode_e.CENTER:
                        let _c = this._arrRefTarget[i].aabb.center;
                        Mat44.createTranslate(_c.x, _c.y, _c.z, this._hpMat4);
                        _m.copyFrom(this._arrRefTarget[i].modelMatrix);
                        _m.multiply(this._hpMat4, _m);
                        break;
                    case AxesMode_e.SELF:
                        _m.copyFrom(this._arrRefTarget[i].modelMatrix);
                        break;
                    case AxesMode_e.PARENT:
                        _m.copyFrom(this._arrRefTarget[i].parentModelMatrix);
                        break;
                }
            }
            this._instanceMatricesBuffer.updateData(this._instanceMatrices);
            if (this._drawCmd.instanceCount != N + 1) {
                this._drawCmd.instanceCount = N + 1;
                this._geometry.setDrawArraysInstancedParameters(this._drawCmd.mode, this._drawCmd.first, this._drawCmd.count, this._drawCmd.instanceCount)
                    .bindDrawCMD();
            }
            this._targetMatricesDirty = false;
        }
    }

    addTarget(target: IAxesTarget): Axes {
        this._arrRefTarget.push(target);
        target.addListener(this, OrthogonalSpace.TRANSFORM_CHANGED);
        this._targetMatricesDirty = true;
        return this;
    }

    setTarget(target: IAxesTarget): Axes {
        this.removeAllTargets();
        return this.addTarget(target);
    }

    removeAllTargets(): Axes {
        this._arrRefTarget.forEach((t) => {
            t.removeListener(this, OrthogonalSpace.TRANSFORM_CHANGED);
        });
        this._arrRefTarget.length = 0;
        this._targetMatricesDirty = true;
        return this;
    }

    set axesMode(m: AxesMode_e) {
        this._mode = m;
        this._targetMatricesDirty = true;
    }

    notify(event: Event_t): boolean {
        this._targetMatricesDirty = true;
        return false;
    }
}

