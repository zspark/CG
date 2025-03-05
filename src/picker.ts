import log from "./log.js"
import { Mat44, roMat44 } from "./math.js";
import { mouseEvents } from "./mouse-events.js"
import { IGeometry } from "./geometry.js"
import { Texture, Program, Pipeline, SubPipeline, Renderer, Framebuffer } from "./gl.js";
import createLoader from "./assets-loader.js";
import { Event_t, default as EventSender } from "./event.js";

export type PickResult_t = {
    last: IPickable,
    picked: IPickable,
}
export interface IPickable {
    readonly uuid: number;
    readonly geometry: IGeometry;
    readonly transform: roMat44;
};

class Framebuffer_C0_r32i extends Framebuffer {

    private _ref_texture_r32i: Texture;
    private _depthTexture: Texture;
    private _clearColor: Int32Array = new Int32Array(4).fill(0);
    private _pixel = new Int32Array(1);

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        super(gl, width, height);
        this._ref_texture_r32i = new Texture(gl, gl.R32I, gl.RED_INTEGER, gl.INT).createGLTextureWithSize(width, height);
        this.attachColorTexture(this._ref_texture_r32i, 0);
        //
        // todo: change to render buffer depth .
        this._depthTexture = new Texture(gl, gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT).createGLTextureWithSize(width, height);
        this.attachDepthTexture(this._depthTexture);
    }
    get criticalKey(): object { return Framebuffer; }
    clear(): void {
        const gl = this._gl;
        gl.clearBufferiv(gl.COLOR, 0, this._clearColor);
        gl.clear(gl.DEPTH_BUFFER_BIT);
    }

    readPixel(x: number, y: number): number {
        const gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._glFramebuffer);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(x, this._height - y, 1, 1, gl.RED_INTEGER, gl.INT, this._pixel);
        return this._pixel[0];
    }
}


export default class Picker extends EventSender<PickResult_t> {
    static PICKED: number = 1;

    private _backFBO: Framebuffer_C0_r32i;
    private _tempMat44: Mat44 = new Mat44().setIdentity();
    private _tempMat44b: Mat44 = new Mat44().setIdentity();
    private _uuidToPickables: Map<number, { t: IPickable, p: SubPipeline }> = new Map();
    private _pipeline: Pipeline;
    private _gl: WebGL2RenderingContext;
    private _event: Event_t<PickResult_t>;
    private _renderer: Renderer;

    constructor(gl: WebGL2RenderingContext, renderer: Renderer) {
        super();
        this._gl = gl;
        this._renderer = renderer;

        this._event = {
            type: Picker.PICKED,
            sender: this,
            info: { last: undefined, picked: undefined },
        };
        this._pipeline = new Pipeline(gl, -2000000)

        const width: number = gl.drawingBufferWidth;
        const height: number = gl.drawingBufferHeight;
        this._backFBO = new Framebuffer_C0_r32i(gl, width, height);

        createLoader("./").loadShader_separate("./glsl/pureRed", "./glsl/attachment-r32i").then((sources) => {
            this._pipeline
                .setProgram(new Program(gl, sources[0], sources[1]))
                .setFBO(this._backFBO)
                .cullFace(true, gl.BACK)
                .depthTest(true, gl.LESS)
                .validate()
        });
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

    private _createSubPipeline(target: IPickable): SubPipeline {
        const gl = this._gl;
        return new SubPipeline()
            .setGeometry(target.geometry)
            .setUniformUpdater({
                updateu_mvpMatrix: (uLoc: WebGLUniformLocation) => {
                    this._tempMat44.multiply(target.transform, this._tempMat44b);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44b.data);
                },
                updateu_uuid: (uLoc: WebGLUniformLocation) => {
                    gl.uniform1i(uLoc, target.uuid);
                },
            });
    }
}
