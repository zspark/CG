import log from "./log.js"
import { Mat44, roMat44 } from "./math.js";
import { mouseEvents } from "./mouse-events.js"
import { GLFramebuffer_C0_r32i } from "./webgl.js"
import { ISubPipeline, IPipeline, IRenderer, ITexture, IGeometry } from "./types-interfaces.js";
import { Texture, Program, Pipeline, SubPipeline, Renderer, Framebuffer } from "./device-resource.js";
import getProgram from "./program-manager.js"
import { Event_t, default as EventSender } from "./event.js";

export type PickResult_t = {
    last: IPickable,
    picked: IPickable,
}
export interface IPickable {
    readonly uuid: number;
    readonly geometry: IGeometry;
    readonly modelMatrix: roMat44;
};


export default class Picker extends EventSender<PickResult_t> {
    static PICKED: number = 1;

    private _backFBO: GLFramebuffer_C0_r32i;
    private _tempMat44: Mat44 = new Mat44().setIdentity();
    private _tempMat44b: Mat44 = new Mat44().setIdentity();
    private _uuidToPickables: Map<number, { t: IPickable, p: ISubPipeline }> = new Map();
    private _pipeline: IPipeline;
    private _gl: WebGL2RenderingContext;
    private _event: Event_t<PickResult_t>;
    private _renderer: IRenderer;

    constructor(gl: WebGL2RenderingContext, renderer: IRenderer) {
        super();
        this._gl = gl;
        this._renderer = renderer;

        this._event = {
            type: Picker.PICKED,
            sender: this,
            info: { last: undefined, picked: undefined },
        };
        this._pipeline = new Pipeline(-2000000)

        const width: number = gl.drawingBufferWidth;
        const height: number = gl.drawingBufferHeight;
        this._backFBO = new GLFramebuffer_C0_r32i(gl, width, height);

        this._pipeline
            .setProgram(getProgram({ r32i: true, }))
            .setFBO(this._backFBO)
            .cullFace(true, gl.BACK)
            .depthTest(true, gl.LESS)
            .validate()
    }

    setMouseEvents(events: mouseEvents): Picker {
        events.onUp((evt) => {
            this._renderer.addPipeline(this._pipeline, { onlyOnce: true });
        });
        events.onClick((evt) => {
            //log.info(evt.x, evt.y);
            let _value = this._backFBO.readPixel(evt.x, evt.y);
            if (_value <= 0) return;
            //log.info('picked id is', _value);
            const _target: IPickable = this._uuidToPickables.get(_value)?.t;
            if (_target === this._event.info.picked) return;
            this._event.info.last = this._event.info.picked;
            this._event.info.picked = _target;
            this._broadcast(this._event);
        });
        return this;
    }

    addPickableTarget(target: IPickable): Picker {
        const _subp = this._createSubPipeline(target);
        this._uuidToPickables.set(target.uuid, { t: target, p: _subp });
        this._pipeline.appendSubPipeline(_subp);
        return this;
    }
    removePickableTarget(target: IPickable): Picker {
        const _v = this._uuidToPickables.get(target.uuid);
        if (_v) {
            this._uuidToPickables.delete(target.uuid);
            this._pipeline.removeSubPipeline(_v.p);
        }
        return this;
    }

    enable(): void {
        //this._enabledFlag = true;
    }
    disable(): void {
        //this._enabledFlag = false;
    }
    update(dt: number, vpMatrix: roMat44): void {
        this._tempMat44.copyFrom(vpMatrix);
    }

    private _createSubPipeline(target: IPickable): ISubPipeline {
        const gl = this._gl;
        return new SubPipeline()
            .setGeometry(target.geometry)
            .setUniformUpdater({
                updateu_mvpMatrix: (uLoc: WebGLUniformLocation) => {
                    this._tempMat44.multiply(target.modelMatrix, this._tempMat44b);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44b.data);
                },
                updateu_uuid: (uLoc: WebGLUniformLocation) => {
                    gl.uniform1i(uLoc, target.uuid);
                },
            });
    }
}
