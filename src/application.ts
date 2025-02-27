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
    private _defaultFBO: CG.Framebuffer;
    private _renderer: CG.Renderer;
    private _shaderSourceURL = "glsl/skybox";
    private _skyboxTexture: CG.SkyboxTexture;

    constructor() {
        const obj = { type: 1 };
        this._gui.add(obj, 'type', { 'point light': 1, 'parallel light': 2, 'spot light': 3 }).onChange((value: string) => {
        });
        const { gl, canvas } = CG.createGlContext('glcanvas');
        this._camera = new CG.Camera(0, 0, 8).lookAt(CG.Vec4.VEC4_0001)
            .setMouseEvents(CG.registMouseEvents(canvas))
            .setFrustum(new CG.Frustum().createPerspectiveProjection(CG.utils.deg2Rad(60), 640 / 480, 0.1, 1000));

        this._defaultFBO = new CG.Framebuffer(gl, false);
        this._renderer = new CG.Renderer(gl);
        this._skyboxTexture = new CG.SkyboxTexture(gl).createGLTextureWithSize(256, 256);


        //--------------------------------------------------------------------------------
        //this._mesh = new CG.Mesh(CG.createTriangle(1).init(gl));
        //this._mesh = new CG.Mesh(CG.createPlane(40, 40).init(gl));
        this._mesh = new CG.Mesh(CG.createCube(200).init(gl));
        //this._ctrl.setSpace(this._mesh).rotateAroundSelfX(CG.utils.deg2Rad(-60));
        const _pipe_cube = new CG.Pipeline(gl)
            .setFBO(this._defaultFBO)
            .setVAO(this._mesh.VAO)
            .setUniformUpdater({
                updateu_mvpMatrix: (uLoc) => {
                    this._mesh.cascade(this._camera.viewProjectionMatrix, this._tempMat44);
                    gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
                },
                updateu_skybox: (uLoc) => {
                    gl.uniform1i(uLoc, this._skyboxTexture.textureUnit);
                },
            })
            .setDrawElementsParameters({
                mode: gl.TRIANGLES,
                count: this._mesh.numberIndices,
                type: gl.UNSIGNED_SHORT,
                offset: 0
            })
            .setTextures(this._skyboxTexture)
            .cullFace(false)

        this._loader.loadShader(this._shaderSourceURL).then((sources) => {
            const _program = new CG.Program(gl, sources[0], sources[1]);
            _pipe_cube.setProgram(_program).validate();
            this._renderer.addPipeline(_pipe_cube);
        });
        this._loader.loadSkyboxTextures("assets/skybox/right.jpg", "assets/skybox/left.jpg", "assets/skybox/top.jpg", "assets/skybox/bottom.jpg", "assets/skybox/front.jpg", "assets/skybox/back.jpg").then((sources) => {
            this._skyboxTexture.updateData(sources, 0, 0, 256, 256);
        });
        //--------------------------------------------------------------------------------

    }

    run(dt: number) {
        this._camera.update(dt);
        this._renderer.render();
    }
}

