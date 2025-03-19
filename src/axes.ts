import glC from "./gl-const.js";
import engineC from "./engine-const.js";
import OrthogonalSpace from "./orthogonal-space.js"
import Mesh from "./mesh.js"
import { DrawArraysInstancedParameter, geometry } from "./geometry.js"
import getProgram from "./program-manager.js"
import { roMat44, Mat44 } from "./math.js";
import { Buffer, Pipeline, SubPipeline, Framebuffer } from "./device-resource.js";
import { IPipeline, IProgram, IFramebuffer, IGeometry, IRenderer, ShaderLocation_e, StepMode_e } from "./types-interfaces.js";
import { IEventDispatcher, Event_t, IEventListener } from "./event.js";
import Geometry from "./geometry.js";

export interface IAxesTarget extends IEventDispatcher {
    readonly modelMatrix: roMat44;
};

export default class Axes implements IEventListener {

    private _targetMatricesDirty = false;
    private _arrRefTarget: IAxesTarget[] = [];
    private _instanceMatrices: Float32Array<ArrayBufferLike>;
    private _instanceMatricesHandler: Mat44;
    private _drawCmd: DrawArraysInstancedParameter = {
        mode: glC.LINES,
        first: 0,
        count: 30,
        instanceCount: 1
    }

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

        const _subp = new SubPipeline()
            .setRenderObject(_geometry)
            .setUniformUpdaterFn((program: IProgram) => {
            });

        this._pipeline = new Pipeline(-1000)
            .setFBO(fbo)
            .setProgram(getProgram({ instanced_matrix: true, color_vertex_attrib: true, }))
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
                _m.copyFrom(this._arrRefTarget[i].modelMatrix);
            }
            this._drawCmd.instanceCount = N + 1;
            this._instanceMatricesBuffer.updateData(this._instanceMatrices);
            this._geometry.setDrawArraysInstancedParameters(this._drawCmd.mode, this._drawCmd.first, this._drawCmd.count, this._drawCmd.instanceCount)
                .bindDrawCMD();
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
        return this;
    }

    notify(event: Event_t): boolean {
        this._targetMatricesDirty = true;
        return false;
    }
}

