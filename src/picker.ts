import log from "./log.js"
import glC from "./gl-const.js";
import { Mat44, roMat44 } from "./math.js";
import { MouseEvents_t } from "./mouse-events.js"
import { GLFramebuffer_C0_r32i } from "./webgl.js"
import { IProgram, ISubPipeline, IPipeline, IRenderer, ITexture, IGeometry } from "./types-interfaces.js";
import { Texture, Program, Pipeline, SubPipeline, Framebuffer } from "./device-resource.js";
import getProgram from "./program-manager.js"
import Mesh from "./mesh.js"
import Primitive from "./primitive.js"
import Geometry from "./geometry.js"
import { Event_t, default as EventDispatcher } from "./event.js";

export type PickResult_t = {
    lastPicked: Pickable_t,
    picked: Pickable_t,
}

export type Pickable_t = {
    readonly mesh: Mesh;
    readonly primitive: Primitive;
};

export default class Picker extends EventDispatcher {
    static PICKED: number = 1;
    static RENDER_ONCE: number = 2;

    private _backFBO: GLFramebuffer_C0_r32i;
    private _uuidToPickables: Map<number, { t: Pickable_t, p: ISubPipeline }> = new Map();
    private _pipeline: IPipeline;
    private _event: Event_t;
    private _eventOnce: Event_t;
    private _pickedResult: PickResult_t = { lastPicked: undefined, picked: undefined };

    constructor(events: MouseEvents_t) {
        super();

        this._eventOnce = {
            type: Picker.RENDER_ONCE,
            sender: this,
        };
        this._event = {
            type: Picker.PICKED,
            sender: this,
        };
        this._pipeline = new Pipeline(-2000000)

        const width: number = 640;
        const height: number = 480;
        this._backFBO = new GLFramebuffer_C0_r32i(width, height);

        this._pipeline
            .setProgram(getProgram({ r32i: true, }))
            .setFBO(this._backFBO)
            .cullFace(true, glC.BACK)
            .depthTest(true, glC.LESS)
            .validate()

        events.onUp((evt) => {
            this._broadcast(this._eventOnce);
        });
        events.onClick((evt) => {
            //log.info(evt.x, evt.y);
            let _value = this._backFBO.readPixel(evt.x, evt.y);
            if (_value <= 0) return;
            //log.info('picked uuid is', _value);
            const _target: Pickable_t = this._uuidToPickables.get(_value)?.t;
            if (_target === this._pickedResult.picked) return;
            this._pickedResult.lastPicked = this._pickedResult.picked;
            this._pickedResult.picked = _target;
            this._broadcast(this._event);
        });
        return this;
    }

    get pipeline(): IPipeline {
        return this._pipeline;
    }

    get pickedResult(): PickResult_t {
        return this._pickedResult;
    }

    addTarget(target: Pickable_t): void {
        const _subp = this._createSubPipeline(target);
        this._uuidToPickables.set(target.mesh.uuid, { t: target, p: _subp });
        this._pipeline.appendSubPipeline(_subp);
    }

    removeTarget(target: Pickable_t): void {
        const _v = this._uuidToPickables.get(target.mesh.uuid);
        if (_v) {
            this._uuidToPickables.delete(target.mesh.uuid);
            this._pipeline.removeSubPipeline(_v.p);
        }
    }

    update(dt: number): void {
    }

    private _createSubPipeline(target: Pickable_t): ISubPipeline {
        return new SubPipeline()
            .setGeometry(target.primitive.geometry)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_mMatrix", target.mesh.modelMatrix.data);
                program.uploadUniform("u_uuid", target.mesh.uuid);
            });
    }
}
