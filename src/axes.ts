import glC from "./gl-const.js";
import engineC from "./engine-const.js";
import OrthogonalSpace from "./orthogonal-space.js"
import Mesh from "./mesh.js"
import { DrawArraysInstancedParameter, geometry } from "./geometry.js"
import getProgram from "./program-manager.js"
import { roMat44, Mat44 } from "./math.js";
import { Buffer, Pipeline, SubPipeline, Framebuffer } from "./device-resource.js";
import { IPipeline, IProgram, IFramebuffer, IRenderer, ShaderLocation_e, StepMode_e } from "./types-interfaces.js";
import { IEventDispatcher, Event_t, IEventListener } from "./event.js";
import Primitive from "./primitive.js";

export interface IAxesTarget extends IEventDispatcher {
    readonly modelMatrix: roMat44;
};

export default class Axes extends Mesh implements IEventListener {

    private _targetMatricesDirty = false;
    private _tempMat44: Mat44 = new Mat44().setIdentity();
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
    private _primitive: Primitive;
    private _pipeline: IPipeline;

    constructor(fbo?: IFramebuffer) {
        super("internal-axes");
        const _primitive = this._primitive = new Primitive("internal-axes-primitive", geometry.createAxes(2));
        this.setPrimitive(_primitive);
        this._instanceMatrices = new Float32Array(engineC.MAX_AXES_INSTANCE_COUNT * 16);
        this._instanceMatricesHandler = new Mat44(this._instanceMatrices, 0).copyFrom(this._transform);
        this._instanceMatricesBuffer
            .setData(this._instanceMatrices, glC.DYNAMIC_DRAW)
            .setStrideAndStepMode(64, StepMode_e.instance)
            .setAttribute(ShaderLocation_e.ATTRIB_INSTANCED_MATRIX_COL_1, 4, glC.FLOAT, false, 0)
            .setAttribute(ShaderLocation_e.ATTRIB_INSTANCED_MATRIX_COL_2, 4, glC.FLOAT, false, 16)
            .setAttribute(ShaderLocation_e.ATTRIB_INSTANCED_MATRIX_COL_3, 4, glC.FLOAT, false, 32)
            .setAttribute(ShaderLocation_e.ATTRIB_INSTANCED_MATRIX_COL_4, 4, glC.FLOAT, false, 48)

        _primitive.geometry.addVertexBuffer(this._instanceMatricesBuffer)
            .setDrawArraysInstancedParameters(this._drawCmd.mode, this._drawCmd.first, this._drawCmd.count, this._drawCmd.instanceCount)

        const _subp = new SubPipeline()
            .setGeometry(_primitive.geometry)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_vpMatrix", this._tempMat44.data);
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

    update(dt: number, vpMatrix: roMat44): void {
        this._tempMat44.copyFrom(vpMatrix);
        if (this._targetMatricesDirty) {
            const _m = this._instanceMatricesHandler;
            const N = this._arrRefTarget.length;
            for (let i = 0; i < N; ++i) {
                _m.remap(this._instanceMatrices, 16 * (i + 1));
                _m.copyFrom(this._arrRefTarget[i].modelMatrix);
            }
            this._drawCmd.instanceCount = N + 1;
            this._instanceMatricesBuffer.updateData(this._instanceMatrices);
            this._primitive.geometry.setDrawArraysInstancedParameters(this._drawCmd.mode, this._drawCmd.first, this._drawCmd.count, this._drawCmd.instanceCount)
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

