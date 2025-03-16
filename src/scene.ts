import { IRenderer, IPipeline, IProgram } from "./types-interfaces.js";
import glC from "./gl-const.js";
import { Pipeline, SubPipeline } from "./device-resource.js";
import getProgram from "./program-manager.js"
import SpacialNode from "./spacial-node.js";
import Mesh from "./mesh.js";
import { default as Camera, ICamera } from "./camera.js";
import { Mat44, Vec4, xyzw, rgba } from "./math.js";
import GridFloor from "./grid-floor.js";
import Axes from "./axes.js";
import { default as Picker, Pickable_t, PickResult_t } from "./picker.js";
import { Event_t } from "./event.js";
import { default as registMouseEvents, MouseEvents_t } from "./mouse-events.js";
import Frustum from "./frustum.js";
import createLoader from "./assets-loader.js";
import SpaceController from "./space-controller.js";
import { GLTFParserOutput_t, default as GLTFParser } from "./gltf-parser.js";
import { ILight, default as light } from "./light-source.js";
import utils from "./utils.js";
import Outline from "./outline.js";
import Renderer from "./renderer.js";
import Skybox from "./skybox.js";
import Material from "./material.js";
import ShadowMap from "./shadow-map.js";

export default class Scene {
    static NEAR_PLANE = 1;
    static FAR_PLANE = 100;

    private _tempMat44 = new Mat44();
    private _tempVec4 = new Vec4();

    private _loader = createLoader("./");
    private _rootNode: SpacialNode = new SpacialNode("root");
    private _meshes: Map<string, Mesh> = new Map();
    private _camera: ICamera;
    private _light: ILight;
    private _gridFloor: GridFloor;
    private _axis: Axes;
    private _picker: Picker;
    private _ctrl: SpaceController;
    private _mouseEvents: MouseEvents_t;
    private _outline: Outline;
    private _renderer: Renderer;
    private _skybox: Skybox;
    private _shadowMap: ShadowMap;
    private _deltaTimeInMS: number = 0;

    private _pickWrapper: {
        pickedResult: PickResult_t,
        addTarget: typeof this._picker.addTarget,
        removeTarget: typeof this._picker.removeTarget,
    };

    constructor(canvas: HTMLCanvasElement) {
        this._renderer = new Renderer({ canvas });
        const _evts = this._mouseEvents = registMouseEvents(canvas);
        this._ctrl = new SpaceController();
        this._camera = new Camera(2, 2, 2).setMouseEvents(_evts).lookAt(Vec4.VEC4_0001);
        this._renderer.registerUBO(this._camera.UBO);
        this._light = new light.PointLight(2, 2, 2);
        this._light.setDirection(-1, -1, -1);
        this._renderer.registerUBO(this._light.UBO);
        this._gridFloor = new GridFloor();
        this._axis = new Axes();
        //this._skybox = new Skybox();
        this._picker = new Picker(_evts);
        this._outline = new Outline();
        this._shadowMap = new ShadowMap(this._renderer.gl);
        this._configWrapper();

        this._renderer.addPipeline(this._gridFloor.pipeline);
        this._renderer.addPipeline(this._axis.pipeline);
        //this._renderer.addPipeline(this._skybox.pipeline);
        this._renderer.addPipeline(this._shadowMap.pipeline);
        const _arrP = this._outline?.pipelines;
        _arrP?.forEach(p => {
            this._renderer.addPipeline(p);
        });

        this._picker.addListener({
            notify: (event: Event_t): boolean => {
                this._renderer.addPipeline(this._picker.pipeline, { renderOnce: true });
                return false;
            },
        }, Picker.RENDER_ONCE);
        this._picker.addListener({
            notify: (event: Event_t): boolean => {
                const _out: PickResult_t = this._picker.pickedResult;
                let _meshCube = _out.picked.mesh;
                _meshCube.getPosition(this._tempVec4);
                this._camera.setRotateCenter(this._tempVec4.x, this._tempVec4.y, this._tempVec4.z);
                this._axis.setTarget(_meshCube);
                this._outline?.setTarget({
                    geometry: _out.picked.primitive.geometry,
                    modelMatrix: _out.picked.mesh.modelMatrix,
                });
                return false;
            },
        }, Picker.PICKED);
    }

    get picker() { return this._pickWrapper; }
    get light() { return this._light.API; }

    loadGLTF() {
        new GLTFParser().load("./assets/gltf/skull/scene.gltf").then((data: GLTFParserOutput_t) => {
            //new GLTFParser().load("./assets/gltf/dragon_sculpture/scene.gltf").then((data: GLTFParserOutput_t) => {
            //new GLTFParser().load("./assets/gltf/cup_with_holder/scene.gltf").then((data: GLTFParserOutput_t) => {
            //new GLTFParser().load("./assets/gltf/glass_bunny/scene.gltf").then((data: GLTFParserOutput_t) => {
            for (let i = 0, N = data.CGMeshs.length; i < N; ++i) {
                //this._ctrl.setSpace(data.CGMeshs[i]).scale(0.2, .2, .2)//.setPosition(-2, -2, 2)
                this.addMesh(data.CGMeshs[i], true, getProgram({ ft_tex_normal: true, ft_shadow: true, ft_phong: true, fn_gltf: true, }));
            }
        });
    }

    addMesh(mesh: Mesh, enablePick: boolean = false, program?: IProgram): Scene {
        const _p = new Pipeline(0)
            .cullFace(true, glC.BACK)
            .depthTest(true, glC.LESS)
            .setProgram(program ?? getProgram({ color_vertex_attrib: true, }))

        mesh.getPrimitives().forEach(p => {
            _p.appendSubPipeline(new SubPipeline()
                .setGeometry(p.geometry)
                .setTexture(this._shadowMap.depthTexture)
                .setTexture(p.material?._normalTexture)
                .setTexture(p.material?._albedoTexture)
                .setUniformUpdaterFn(this._createUpdater(mesh, p.material, new Vec4(1, 0, 0, 1)))
                .validate()
            );
        });
        this._renderer.addPipeline(_p);
        this._meshes.set(mesh.name, mesh);
        if (enablePick && this._picker) {
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

    private _createUpdater(mesh: Mesh, material: Material, color: rgba) {
        return (program: IProgram) => {
            program.uploadUniform("u_mMatrix", mesh.modelMatrix.data);
            this._tempMat44.copyFrom(mesh.modelMatrix).invertTransposeLeftTop33();// this one is right.
            program.uploadUniform("u_mMatrix_dir", this._tempMat44.data);
            //this._light.lightMatrix.multiply(this._tempMat44, this._tempMat44);
            //program.uploadUniform("u_mlMatrix_normal", this._tempMat44.data);
            //this._light.lightProjectionMatrix.multiply(mesh.modelMatrix, this._tempMat44);
            //program.uploadUniform("u_mlpMatrix", this._tempMat44.data);
            //this._light.lightMatrix.multiply(mesh.modelMatrix, this._tempMat44);
            //program.uploadUniform("u_mlMatrix", this._tempMat44.data);
            program.uploadUniform("u_shadowMap", this._shadowMap.depthTexture.textureUnit);
            if (material?._normalTexture) {
                program.uploadUniform("u_normalTexture", material._normalTexture.textureUnit);
                program.uploadUniform("u_normalTextureUVIndex", material._normalTexture.UVIndex);
            }
            if (material?._albedoTexture) {
                program.uploadUniform("u_albedoTexture", material._albedoTexture.textureUnit);
                program.uploadUniform("u_albedoTextureUVIndex", material._albedoTexture.UVIndex);
            }
            program.uploadUniform("u_color", [color.r, color.g, color.b]);
            program.uploadUniform("u_nearFarPlane", [Scene.NEAR_PLANE, Scene.FAR_PLANE]);
            /// --------------------------------------------------------------------------------
            /// debug normals;
            this._tempMat44.copyFrom(mesh.modelMatrix).invertTransposeLeftTop33();
            program.uploadUniform("u_debugNormalModelMatrix", this._tempMat44.data);
            program.uploadUniform("u_debugNormalViewMatrix", this._camera.viewMatrix.data);
            program.uploadUniform("u_debugNormalSpace", 1);
            /// --------------------------------------------------------------------------------
        };
    }

    private _configWrapper(): void {
        this._pickWrapper = {
            pickedResult: this._picker.pickedResult,
            addTarget: this._picker.addTarget,
            removeTarget: this._picker.removeTarget,
        };
    }
}
