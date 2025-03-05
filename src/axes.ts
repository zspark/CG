import glC from "./gl-const.js";
import engineC from "./engine-const.js";
import OrthogonalSpace from "./orthogonal-space.js"
import Mesh from "./mesh.js"
import { DrawArraysInstancedParameter, geometry } from "./geometry.js"
import getProgram from "./program-manager.js"
import { roMat44, Mat44 } from "./math.js";
import { Pipeline, SubPipeline, Renderer, Framebuffer } from "./gl.js";
import { IEventReceiver, Event_t } from "./event.js";

export default class Axes extends Mesh implements IEventReceiver<number> {

    private _targetMatricesDirty = false;
    private _tempMat44: Mat44 = new Mat44().setIdentity();
    private _arrRefTarget: OrthogonalSpace[] = [];
    private _instanceMatrices: Float32Array<ArrayBufferLike>;
    private _instanceMatricesHandler: Mat44;
    private _drawCmd: DrawArraysInstancedParameter = {
        mode: glC.LINES,
        first: 0,
        count: 30,
        instanceCount: 1
    }

    constructor(gl: WebGL2RenderingContext, renderer: Renderer, fbo?: Framebuffer) {
        super(geometry.createAxes(2));
        this._instanceMatrices = new Float32Array(engineC.MAX_AXES_INSTANCE_COUNT * 16);
        this._instanceMatricesHandler = new Mat44(this._instanceMatrices, 0).copyFrom(this._transform);
        this._ref_geo.appendInstancedData(this._instanceMatrices, 1, glC.DYNAMIC_DRAW)
            .setDrawArraysInstancedParameters(this._drawCmd.mode, this._drawCmd.first, this._drawCmd.count, this._drawCmd.instanceCount)
            .init(gl);


        const _subPipe = new SubPipeline()
            .setGeometry(this._ref_geo)
            .setUniformUpdater({
                updateu_vpMatrix: (uLoc: WebGLUniformLocation) => {
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
                },
            })

        const _pipeline = new Pipeline(gl, -1000)
            .setFBO(fbo)
            .setProgram(getProgram(gl, { instanced_matrix: true, color_vertex_attrib: true, }))
            .appendSubPipeline(_subPipe)
            .depthTest(false/*, glC.LESS*/)
            .validate();

        renderer.addPipeline(_pipeline);
    }

    update(dt: number, vpMatrix: roMat44): void {
        this._tempMat44.copyFrom(vpMatrix);
        if (this._targetMatricesDirty) {
            const _m = this._instanceMatricesHandler;
            const N = this._arrRefTarget.length;
            for (let i = 0; i < N; ++i) {
                _m.remap(this._instanceMatrices, 16 * (i + 1));
                _m.copyFrom(this._arrRefTarget[i].transform);
            }
            this._drawCmd.instanceCount = N + 1;
            this._ref_geo.updateInstancedData()
                .setDrawArraysInstancedParameters(this._drawCmd.mode, this._drawCmd.first, this._drawCmd.count, this._drawCmd.instanceCount)
                .bindDrawCMD();
            this._targetMatricesDirty = false;
        }
    }
    addTarget(target: OrthogonalSpace): Axes {
        this._arrRefTarget.push(target);
        target.addReceiver(this, OrthogonalSpace.TRANSFORM_CHANGED);
        this._targetMatricesDirty = true;
        return this;
    }
    setTarget(target: OrthogonalSpace): Axes {
        this.removeAllTargets();
        return this.addTarget(target);
    }
    removeAllTargets(): Axes {
        this._arrRefTarget.forEach((t) => {
            t.removeReceiver(this, OrthogonalSpace.TRANSFORM_CHANGED);
        });
        this._arrRefTarget.length = 0;
        return this;
    }

    notify(event: Event_t<number>): boolean {
        this._targetMatricesDirty = true;
        return false;
    }
}

