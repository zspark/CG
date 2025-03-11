//@ts-ignore
import * as dat from "../third/dat.gui.module.js";
import * as CG from "./api.js";

export default class Application {

    private _gui = new dat.GUI();
    private _ctrl = new CG.SpaceController();
    private _geometryCube: CG.IGeometry;
    private _scene: CG.Scene;

    constructor() {
        this.createGUI();
        CG.registWebGL();
        CG.programManagerHint(true, true);
        const canvas: HTMLCanvasElement = document.getElementById("glcanvas") as HTMLCanvasElement;
        this._scene = new CG.Scene(canvas);

        //--------------------------------------------------------------------------------
        //--------------------------------------------------------------------------------
        this._geometryCube = CG.geometry.createCube(2);
        const _primitive = new CG.Primitive("primitive-cube", this._geometryCube);
        const _meshCube1 = new CG.Mesh("MeshCube1", _primitive);
        const _meshCube2 = new CG.Mesh("MeshCube2", _primitive);
        const _meshCube3 = new CG.Mesh("MeshCube3", _primitive);
        this._ctrl.setSpace(_meshCube1).setPosition(2, 2, 2)
            .setSpace(_meshCube2).setPosition(-4, -4, 3).rotateAroundSelfX(Math.PI / 3)
            .setSpace(_meshCube3).setPosition(0.5, 6, -8).rotateAroundSelfY(1.7).rotateAroundSelfZ(0.33);

        this._scene.addMesh(_meshCube1, true);
        this._scene.addMesh(_meshCube2, true);
        this._scene.addMesh(_meshCube3, true);
        this._scene.loadGLTF();
        //--------------------------------------------------------------------------------
        //
        //--------------------------------------------------------------------------------
    }

    run(dt: number) {
        this._scene.update(dt);
    }

    createGUI() {
        let _data = [0, 0, 0, 0, 0, 0];
        const obj = {
            rotateSlefX: 0, rotateSlefY: 0, rotateSlefZ: 0,
            rotateParentX: 0, rotateParentY: 0, rotateParentZ: 0,
        };
        this._gui.add(obj, 'rotateSlefX').min(-360).max(360).step(0.25).onChange((v: number) => {
            //console.log(v);
            this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundSelfX(CG.utils.deg2Rad(v - _data[0]));
            _data[0] = v;
        });
        this._gui.add(obj, 'rotateSlefY').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundSelfY(CG.utils.deg2Rad(v - _data[1]));
            _data[1] = v;
        });
        this._gui.add(obj, 'rotateSlefZ').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundSelfZ(CG.utils.deg2Rad(v - _data[2]));
            _data[2] = v;
        });
        this._gui.add(obj, 'rotateParentX').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundParentX(CG.utils.deg2Rad(v - _data[3]));
            _data[3] = v;
        });
        this._gui.add(obj, 'rotateParentY').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundParentY(CG.utils.deg2Rad(v - _data[4]));
            _data[4] = v;
        });
        this._gui.add(obj, 'rotateParentZ').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundParentZ(CG.utils.deg2Rad(v - _data[5]));
            _data[5] = v;
        });
    }
}

