import { IMaterial, IRenderer, IPipeline, IProgram, ITexture } from "./types-interfaces.js";
import glC from "./gl-const.js";
import { Pipeline, SubPipeline, Texture } from "./device-resource.js";
import getProgram from "./program-manager.js"
import SpacialNode from "./spacial-node.js";
import Mesh from "./mesh.js";
import { default as Camera, ICamera } from "./camera.js";
import { Mat44, Vec4, xyzw, rgba } from "./math.js";
import GridFloor from "./grid-floor.js";
import { default as Axes, AxesMode_e } from "./axes.js";
import { default as Picker, Pickable_t, PickResult_t } from "./picker.js";
import EventDispatcher, { Event_t } from "./event.js";
import { default as registMouseEvents, MouseEvents_t } from "./mouse-events.js";
import { default as createLoader } from "./assets-loader.js";
import SpaceController from "./space-controller.js";
import { GLTFParserOutput_t, default as GLTFParser } from "./gltf-parser.js";
import { ILight, default as light } from "./light-source.js";
import Outline from "./outline.js";
import Renderer from "./renderer.js";
import Skybox from "./skybox.js";
import { default as Material, getUBO as getMaterialUBO } from "./material.js";
import ShadowMap from "./shadow-map.js";
import * as windowEvents from "./window-events.js"
import EquirectangularToCube from "./equirectangular-to-cube.js";
import Environment from "./environment.js";
import BRDFLutGenerator from "./brdf-lut-generator.js";

export default class Scene {

    private _tempMat44 = new Mat44();
    private _tempVec4 = new Vec4();

    private _debugValue: number = -1;
    private _debugColorValue: number = -1;
    private _loader = createLoader("./");
    private _rootNode: SpacialNode = new SpacialNode("root");
    private _camera: ICamera;
    private _light: ILight;
    private _gridFloor: GridFloor;
    private _axis: Axes;
    private _picker: Picker;
    private _ctrl: SpaceController;
    private _mouseEvents: MouseEvents_t;
    private _env: Environment;
    private _outline: Outline;
    private _renderer: Renderer;
    private _skybox: Skybox;
    private _shadowMap: ShadowMap;
    private _deltaTimeInMS: number = 0;
    private _canvas: HTMLCanvasElement;
    private _pbrPipeline: IPipeline;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._renderer = new Renderer({ canvas });
        const _evts = this._mouseEvents = registMouseEvents(canvas);
        this._ctrl = new SpaceController();
        this._camera = new Camera(2.64, 4.0, 4.37).setMouseEvents(_evts).lookAt(Vec4.VEC4_0001);
        this._renderer.registerUBO(this._camera.UBO);
        this._light = new light.PointLight(4, 4, 4);
        this._light.setDirection(-1, -1, -1);
        this._light.intensity = 0.;
        this._renderer.addPipeline(this._light.createDebugPipeline());
        this._renderer.registerUBO(this._light.UBO);
        this._renderer.registerUBO(getMaterialUBO());
        this._gridFloor = new GridFloor();
        this._axis = new Axes();
        this._picker = new Picker(_evts);
        this._outline = new Outline();
        this._shadowMap = new ShadowMap(this._renderer.gl);


        this._pbrPipeline = new Pipeline(0, "pbr pipeline")
            .cullFace(true, glC.BACK)
            .addTexture(this._shadowMap.depthTexture)
            .depthTest(true, glC.LESS)
            //.blend(true, glC.SRC_ALPHA, glC.ONE_MINUS_SRC_ALPHA, glC.FUNC_ADD)
            .setProgram(getProgram("pbr", {
                ft_pbr: true,
                ft_shadow: true,
                cube: false,
                debug: true,
                tone_mapping: false,
                gamma_correct: true,
            }));
        this._renderer.addPipeline(this._pbrPipeline);
        this._renderer.addPipeline(this._gridFloor.pipeline);
        this._renderer.addPipeline(this._axis.pipeline);
        this._renderer.addPipeline(this._shadowMap.pipeline);
        this.showOutline = false;

        this._picker.addListener({
            notify: (event: Event_t): boolean => {
                this._renderer.addPipeline(this._picker.pipeline, { renderOnce: true });
                return false;
            },
        }, Picker.RENDER_ONCE);
        this._picker.addListener({
            notify: (event: Event_t): boolean => {
                const _out: PickResult_t = this._picker.pickedResult;
                if (_out.picked) {
                    let _node = _out.picked.mesh;
                    const _c = _node.aabb.center;
                    _node.modelMatrix.multiplyVec4(_c, this._tempVec4);
                    this._camera.setRotateCenterVec(this._tempVec4);
                    this._axis?.setTarget(_node);
                    this._outline?.setTarget({
                        renderObject: _out.picked.primitive.geometry,
                        modelMatrix: _out.picked.mesh.modelMatrix,
                    });
                } else {
                    this._camera.setRotateCenterVec(Vec4.VEC4_0000);
                    this._axis?.removeAllTargets();
                    this._outline?.removeAllTargets();
                }
                return false;
            },
        }, Picker.PICKED);

        const _resize = (w: number, h: number) => {
            this._canvas.width = w;
            this._canvas.height = h;
        };
        const { width, height } = windowEvents.getWindowSize();
        _resize(width, height);
        windowEvents.onResize(_resize);
    }

    get picker() { return this._picker.API; }
    get light() { return this._light.API; }
    get camera() { return this._camera.API; }

    setSkybox(url: string) {
        this._env = new Environment(url);
        this._env.addListener({
            notify: (evt: Event_t): boolean => {
                const _arrPipeline = this._env.pipelines;
                _arrPipeline.forEach(p => {
                    this._renderer.addPipeline(p);
                });

                this._pbrPipeline
                    .addTexture(this._env.irradianceTexture)
                    .addTexture(this._env.brdfLutTexture)
                    .addTexture(this._env.prefilteredTexture)

                this._skybox ??= new Skybox(this._env.environmentTexture);
                //const _v = new EquirectangularToCube(_texture, this._skybox.cubeTexture);
                //this._renderer.addPipeline(_v.pipeline, { renderOnce: true });
                this._renderer.addPipeline(this._skybox.pipeline, { repeat: false });
                return false;
            }
        }, Environment.EVT_LOADED);
    }

    setAxesMode(mode: AxesMode_e): void {
        this._axis && (this._axis.axesMode = mode);
    }

    setDebugValue(value: number): void {
        this._debugValue = value;
    }
    setDebugColorValue(value: number): void {
        this._debugColorValue = value;
    }
    generateBRDFLut(): void {
        this._renderer.addPipeline(new BRDFLutGenerator(glC.RGB, glC.RGB, glC.UNSIGNED_BYTE).pipeline, { renderOnce: true });
    }

    private _outlineShow: boolean = false;
    set showOutline(v: boolean) {
        if (v && !this._outlineShow) {
            this._outlineShow = true;
            const _arrP = this._outline?.pipelines;
            _arrP?.forEach(p => {
                this._renderer.addPipeline(p);
            });
        } else {
            this._outlineShow = false;
            const _arrP = this._outline?.pipelines;
            _arrP?.forEach(p => {
                this._renderer.removePipeline(p);
            });
        }
    }

    addMesh(mesh: Mesh): Scene {
        mesh.getPrimitives().forEach(p => {
            this._pbrPipeline.appendSubPipeline(new SubPipeline()
                .setRenderObject(p)
                .setMaterial(p.material)
                .setUniformUpdaterFn(this._createUpdater(mesh, p.material))
                .validate()
            );
        });
        if (mesh.enablePick && this._picker) {
            this._addToPicker(mesh.getPickables());
        }
        this._shadowMap.addTarget(mesh);
        return this;
    }

    private _addToPicker(targets: Pickable_t[]): Scene {
        targets.forEach(p => {
            this._picker.addTarget(p);
        });
        return this;
    }

    update(dt: number): void {
        this._deltaTimeInMS = dt;
        this._light?.update(dt);
        this._camera?.update(dt);
        this._gridFloor?.update(dt);
        this._picker?.update(dt);
        this._axis?.update(dt);
        this._skybox?.update(dt);
        this._outline?.update(dt);
        this._renderer.render();
    }

    private _createUpdater(mesh: Mesh, material: IMaterial) {
        return (program: IProgram) => {
            program.uploadUniform("u_mMatrix", mesh.modelMatrix.data);
            this._tempMat44.copyFrom(mesh.modelMatrix).invertTransposeLeftTop33();// this one is right.
            program.uploadUniform("u_mMatrix_dir", this._tempMat44.data);
            program.uploadUniform("u_shadowMap", this._shadowMap.depthTexture.textureUnit);
            if (this._env?.brdfLutTexture) {
                program.uploadUniform("u_brdfLutTexture", this._env.brdfLutTexture.textureUnit);
            }
            if (this._env?.irradianceTexture) {
                program.uploadUniform("u_irradianceTexture", this._env.irradianceTexture.textureUnit);
                program.uploadUniform("u_prefilteredTexture", this._env.prefilteredTexture.textureUnit);
            }
            if (material) {
                program.uploadUniform("u_pbrTextures[0]", [
                    material.normalTexture.textureUnit,
                    material.occlusionTexture.textureUnit,
                    material.emissiveTexture.textureUnit,
                    material.pbrMR_baseColorTexture.textureUnit,
                    material.pbrMR_metallicRoughnessTexture.textureUnit,
                ]);
                program.uploadUniform("u_pbrTextureCoordIndex[0]", [
                    material.normalTexture.UVIndex ?? 0,
                    material.occlusionTexture.UVIndex ?? 0,
                    material.emissiveTexture.UVIndex ?? 0,
                    material.pbrMR_baseColorTexture.UVIndex ?? 0,
                    material.pbrMR_metallicRoughnessTexture.UVIndex ?? 0,
                ]);
                program.uploadUniform("u_textureDebug", this._debugValue);
                program.uploadUniform("u_colorDebug", this._debugColorValue);
            }
            program.uploadUniform("u_nearFarPlane", [Camera.NEAR_PLANE, Camera.FAR_PLANE]);
        };
    }
}
