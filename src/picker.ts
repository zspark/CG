import log from "./log.js"
import glC from "./gl-const.js";
import { MouseEvents_t } from "./mouse-events.js"
import { GLFramebuffer_C0_r32i } from "./webgl.js"
import { IProgram, ISubPipeline, IPipeline, IRenderer, ITexture, IGeometry } from "./types-interfaces.js";
import * as windowEvents from "./window-events.js"
import { Texture, Program, Pipeline, SubPipeline, Framebuffer } from "./device-resource.js";
import { createProgram } from "./program-manager.js"
import Mesh from "./mesh.js"
import Primitive from "./primitive.js"
import { Event_t, default as EventDispatcher, IEventDispatcher } from "./event.js";

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
uniform int u_uuid;
out int o_pickable;
void main() {
    o_pickable = u_uuid;
}`;

export type PickResult_t = {
    lastPicked: Pickable_t,
    picked: Pickable_t,
}

export type Pickable_t = {
    readonly mesh: Mesh;
    readonly primitive: Primitive;
};

export interface api_IPicker extends IEventDispatcher {
    readonly pickedResult: PickResult_t;
    addTarget(target: Pickable_t): void;
    removeTarget(target: Pickable_t): void;
};

export interface IPicker extends api_IPicker {
    readonly pipeline: IPipeline;
    readonly API: api_IPicker;
    update(dt: number): void;
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

        const { width, height } = windowEvents.getWindowSize();
        this._backFBO = new GLFramebuffer_C0_r32i(width, height);

        this._pipeline
            .setProgram(createProgram(_vert, _frag))
            .setFBO(this._backFBO)
            .cullFace(true, glC.BACK)
            .depthTest(true, glC.LESS)
            .validate()

        events.onUp((evt) => {
            this._broadcast(this._eventOnce);
        });
        events.onClick((evt) => {
            //log.info(evt.x, evt.y);
            let _target: Pickable_t;
            let _value = this._backFBO.readPixel(evt.x, evt.y);
            if (_value > 0) {
                //log.info('picked uuid is', _value);
                _target = this._uuidToPickables.get(_value)?.t;
            }
            if (_target === this._pickedResult.picked) return;
            this._pickedResult.lastPicked = this._pickedResult.picked;
            this._pickedResult.picked = _target;
            this._broadcast(this._event);
        });

        windowEvents.onResize((w: number, h: number) => {
            this._backFBO.resize(w, h);
        });
    }

    get API(): api_IPicker {
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
            .setRenderObject(target.primitive.geometry)
            .setUniformUpdaterFn((program: IProgram) => {
                program.uploadUniform("u_mMatrix", target.mesh.modelMatrix.data);
                program.uploadUniform("u_uuid", target.mesh.uuid);
            });
    }
}
