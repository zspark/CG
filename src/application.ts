//@ts-ignore
import * as dat from "../third/dat.gui.module.js";
import * as CG from "./api.js";

export default class Application {
    private _gui = new dat.GUI();
    private _tempMat44 = new CG.Mat44();
    private _loader = CG.createLoader("./");
    private _camera: CG.Camera;
    private _ctrl = new CG.SpaceController();
    private _mesh: CG.Mesh;
    private _pointLight = new CG.light.PointLight(0, 14, 0);
    private _spotLight = new CG.light.SpotLight(0, 14, 0);
    private _parallelLight = new CG.light.ParallelLight(0, 14, 0);
    private _defaultFBO: CG.Framebuffer;
    private _renderer: CG.Renderer;
    private _shaderSourceURL = "glsl/lights";

    constructor() {
        this._spotLight.setCutoffDistance(16);
        this._spotLight.setAngle(CG.utils.deg2Rad(5));
        const obj = { type: 1 };
        this._gui.add(obj, 'type', { 'point light': 1, 'parallel light': 2, 'spot light': 3 }).onChange((value: string) => {
            if (value === "1") {
                _light = this._pointLight;
            } else if (value === "2") {
                _light = this._parallelLight;
            } else if (value === "3") {
                _light = this._spotLight;
            }
        });
        const { gl, canvas } = CG.createGlContext('glcanvas');
        this._camera = new CG.Camera(0, 0, 8).lookAt(CG.Vec4.VEC4_0001)
            .setMouseEvents(CG.registMouseEvents(canvas))
            .setFrustum(new CG.Frustum().createPerspectiveProjection(CG.utils.deg2Rad(60), 640 / 480, 0.1, 1000));

        this._defaultFBO = new CG.Framebuffer(gl, false);
        this._renderer = new CG.Renderer(gl);
        let _light: CG.ILight = this._pointLight;


        //--------------------------------------------------------------------------------
        //this._mesh = new CG.Mesh(CG.createTriangle(1).init(gl));
        this._mesh = new CG.Mesh(CG.createCube(2).init(gl));
        //this._mesh = new CG.Mesh(CG.createPlane(40, 40).init(gl));
        this._mesh.setPosition(0, 0, 0);
        this._ctrl.setSpace(this._mesh).rotateAroundSelfX(CG.utils.deg2Rad(-60));
        const _pipe_cube = new CG.Pipeline(gl)
            .setFBO(this._defaultFBO)
            .setVAO(this._mesh.VAO)
            .setUniformUpdater({
                updateu_mvpMatrix: (uLoc) => {
                    this._mesh.cascade(this._camera.viewProjectionMatrix, this._tempMat44);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
                },
                updateu_mMatrix: (uLoc) => {
                    gl.uniformMatrix4fv(uLoc, false, this._mesh.transform.data);
                },
                updateu_lightType: (uLoc) => {
                    gl.uniform1i(uLoc, Number(obj.type));
                },
                updateu_lightAngle: (uLoc) => {
                    gl.uniform1f(uLoc, _light.angle);
                },
                updateu_lightCutoff: (uLoc) => {
                    gl.uniform1f(uLoc, _light.cutoffDistance);
                },
                updateu_lightColor: (uLoc) => {
                    const c = _light.color;
                    gl.uniform4f(uLoc, c.x, c.y, c.z, c.w);
                },
                updateu_lightPositionW: (uLoc) => {
                    const p = _light.position;
                    gl.uniform3f(uLoc, p.x, p.y, p.z);
                },
                updateu_lightDirectionW: (uLoc) => {
                    const d = _light.direction;
                    gl.uniform3f(uLoc, d.x, d.y, d.z);
                },
            })
            .setDrawElementsParameters({
                mode: gl.TRIANGLES,
                count: this._mesh.numberIndices,
                type: gl.UNSIGNED_SHORT,
                offset: 0
            })
            .cullFace(true)

        this._loader.loadShader(this._shaderSourceURL).then((sources) => {
            const _program = new CG.Program(gl, sources[0], sources[1]);
            _pipe_cube.setProgram(_program).validate();
            this._renderer.addPipeline(_pipe_cube);
        });
        //--------------------------------------------------------------------------------

    }

    run(dt: number) {
        this._camera.update(dt);
        this._renderer.render();
    }
}

