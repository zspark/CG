import log from "./log.js"
import {
    IUniformBlock,
    IRenderContext,
    IRenderer,
    IGeometry,
    IBuffer, BufferData_t, StepMode_e, ShaderLocation_e,
    IProgram,
    ITexture,
    IFramebuffer,
    IPipeline, ISubPipeline, UniformUpdaterFn_t, PipelineOption_t, SubPipelineOption_t,
    IBindableObject,
} from "./types-interfaces.js";
import { createContext, Framebuffer } from "./device-resource.js";

class RenderContext implements IRenderContext {

    private _state: Map<GLenum, boolean | GLenum> = new Map();
    private _wm_glObject = new WeakMap();
    private _gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext) {
        this._gl = gl;
        const _s = this._state;
        _s.set(gl.BLEND, gl.getParameter(gl.BLEND));
        _s.set(gl.BLEND_EQUATION, gl.getParameter(gl.BLEND_EQUATION));
        _s.set(gl.BLEND_SRC_RGB, gl.getParameter(gl.BLEND_SRC_RGB));
        _s.set(gl.BLEND_DST_RGB, gl.getParameter(gl.BLEND_DST_RGB));

        _s.set(gl.DEPTH_TEST, gl.getParameter(gl.DEPTH_TEST));
        _s.set(gl.DEPTH_FUNC, gl.getParameter(gl.DEPTH_FUNC));

        _s.set(gl.CULL_FACE, gl.getParameter(gl.CULL_FACE));
        _s.set(gl.CULL_FACE_MODE, gl.getParameter(gl.CULL_FACE_MODE));
    }

    get gl(): WebGL2RenderingContext {
        return this._gl;
    }

    bind(obj: IBindableObject) {
        if (this._wm_glObject.get(obj.criticalKey) === obj) return this;
        else {
            this._wm_glObject.set(obj.criticalKey, obj);
            obj.bind();
            return this;
        }
    }

    setDepthTest(enable: boolean, func: GLenum) {
        const gl = this._gl;
        const _state = this._state;
        if (_state.get(gl.DEPTH_TEST) != enable) {
            enable ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
            _state.set(gl.DEPTH_TEST, enable);
        }
        if (enable) {
            if (_state.get(gl.DEPTH_FUNC) != func) {
                gl.depthFunc(func);
                _state.set(gl.DEPTH_FUNC, func);
            }
        }
    }

    setBlend(enable: boolean, funcSF: GLenum, funcDF: GLenum, equation: GLenum) {
        const gl = this._gl;
        const _state = this._state;
        if (_state.get(gl.BLEND) != enable) {
            enable ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
            _state.set(gl.BLEND, enable);
        }
        if (enable) {
            if (_state.get(gl.BLEND_EQUATION) != equation) {
                gl.blendEquation(equation);
                _state.set(gl.BLEND_EQUATION, equation);
            }
            if (_state.get(gl.BLEND_SRC_RGB) != funcSF || _state.get(gl.BLEND_DST_RGB) != funcDF) {
                gl.blendFunc(funcSF, funcDF);
                _state.set(gl.BLEND_SRC_RGB, funcSF);
                _state.set(gl.BLEND_DST_RGB, funcDF);
            }
        }
    }

    setCullFace(enable: boolean, faceToCull: GLenum) {
        const gl = this._gl;
        const _state = this._state;
        if (_state.get(gl.CULL_FACE) != enable) {
            enable ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
            _state.set(gl.CULL_FACE, enable);
        }
        if (enable) {
            if (_state.get(gl.CULL_FACE_MODE) != faceToCull) {
                gl.cullFace(faceToCull);
                _state.set(gl.CULL_FACE_MODE, faceToCull);
            }
        }
    }
}

export type RendererOptions_t = {
    canvas: HTMLCanvasElement,
}

export interface IRenderable {
    get pipeline(): IPipeline;
}

export default class Renderer implements IRenderer {

    private _defaultFBO: IFramebuffer;
    private _maxTextureUnits: number;
    private _arrPipeline: IPipeline[];
    private _arrPipeline_1: IPipeline[] = [];
    private _arrPipeline_2: IPipeline[] = [];
    private _arrOneTimePipeline: IPipeline[] = [];
    private _arrTransparentPipeline: IPipeline[] = [];
    private _device: WebGL2RenderingContext;
    private _renderContext: RenderContext;
    private _arrBindingPointsToUBO: IUniformBlock[] = [];

    constructor(options: RendererOptions_t) {
        const _gl = this._device = createContext(options.canvas);
        this._renderContext = new RenderContext(_gl);
        this._defaultFBO = new Framebuffer(0, 0);
        this._maxTextureUnits = _gl.getParameter(_gl.MAX_TEXTURE_IMAGE_UNITS);
        this._arrPipeline = this._arrPipeline_1;
    }

    get gl(): WebGL2RenderingContext {
        return this._device;
    }

    registerUBO(ubo: IUniformBlock): IRenderer {
        this._arrBindingPointsToUBO[ubo.bindingPoint] = ubo;
        return this;
    }

    render(): IRenderer {
        this._arrPipeline.forEach((p) => {
            p.execute(this._renderContext);
        });
        this._arrOneTimePipeline.forEach((p) => {
            p.execute(this._renderContext);
        });
        this._arrOneTimePipeline.length = 0;
        this._arrTransparentPipeline.forEach((p) => {
            p.execute(this._renderContext);
        });
        return this;
    }

    addPipeline(p: IPipeline, option?: PipelineOption_t): IRenderer {
        let _onlyOnce = (option?.renderOnce) ? true : false;
        let _repeat = (option?.repeat) ? true : false;

        const _list = _onlyOnce ? this._arrOneTimePipeline : this._arrPipeline;
        if (_list.indexOf(p) >= 0 && !_repeat) {
            return this;
        }

        p.FBO ??= this._defaultFBO;
        p.createGPUResource(this._device);
        this._arrBindingPointsToUBO.forEach(ubo => {
            p.program.setUBO(ubo);
        });
        _list.push(p);
        this._sortPipline();
        return this;
    }

    addTransparentPipeline(p: IPipeline): IRenderer {
        this._arrTransparentPipeline.push(p);
        return this;
    }

    removePipeline(p: IPipeline): IRenderer {
        for (let i = 0; i < this._arrPipeline.length; ++i) {
            if (this._arrPipeline[i] === p) {
                this._arrPipeline.splice(i, 1);
                break;
            }
        }
        return this;
    }

    private _sortPipline() {
        const _arrCurrentP = this._arrPipeline;
        //const _arrFutureP = _arrCurrentP === this._arrPipeline_1 ? this._arrPipeline_2 : this._arrPipeline_1;
        _arrCurrentP.sort((a, b) => b.priority - a.priority);
    }
}

