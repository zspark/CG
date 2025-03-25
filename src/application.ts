//@ts-ignore
import * as dat from "../third/lil-gui.esm.min.js";
import * as CG from "./api.js";

export default class Application {

    private _gui = new dat.GUI();
    private _ctrl = new CG.SpaceController();
    private _geometryCube: CG.IGeometry;
    private _scene: CG.Scene;

    constructor(canvas: HTMLCanvasElement) {
        CG.registWebGL();
        CG.programManagerHint(true, true);
        const _scene = this._scene = new CG.Scene(canvas);

        //--------------------------------------------------------------------------------
        //--------------------------------------------------------------------------------
        this._geometryCube = CG.geometry.createCube(2);
        let _primitive = new CG.Primitive("primitive-cube", this._geometryCube);
        let _meshCube1 = new CG.Mesh("MeshCube1", _primitive);
        let _meshCube2 = new CG.Mesh("MeshCube2", _primitive);
        let _meshCube3 = new CG.Mesh("MeshCube3", _primitive);
        this._ctrl.setSpace(_meshCube1).setPosition(2, 2, 2)
            .setSpace(_meshCube2).setPosition(-4, -4, 3).rotateAroundSelfX(Math.PI / 3)
            .setSpace(_meshCube3).setPosition(0.5, 6, -8).rotateAroundSelfY(1.7).rotateAroundSelfZ(0.33);
        //this._scene.addMesh(_meshCube1, true, p);
        //this._scene.addMesh(_meshCube2, true, p);
        //this._scene.addMesh(_meshCube3, true, p);
        _scene.loadModel(
            //"./assets/gltf/MetalRoughSpheres.glb"
            //"./assets/gltf/skull/scene.gltf"
            //"./assets/gltf/cube/scene.gltf"
            //"./assets/gltf/cup_with_holder/scene.gltf"
            //"./assets/gltf/sphere/scene.gltf"
            //"./assets/gltf/stanford_dragon_vrip/scene.gltf"
            //"./assets/gltf/metal_dragon/scene.gltf"
            "./assets/gltf/vintage_metal_ashtray/scene.gltf"
            //"./assets/gltf/haunted_house/scene.gltf"
            //"./assets/gltf/dragon_sculpture/scene.gltf"
            //"./assets/gltf/glass_bunny/scene.gltf"
        );
        const _geometryPlane = CG.geometry.createPlane(10, 10);
        let _meshPlane = new CG.Mesh("MeshPlane", new CG.Primitive("primitive-plane", _geometryPlane));
        _scene.addMesh(_meshPlane, false);
        //--------------------------------------------------------------------------------
        //
        //--------------------------------------------------------------------------------
        this.createGUI();
    }

    run(dt: number) {
        this._scene.update(dt);
    }

    createGUI() {
        {
            const _obj = {
                showOutline: true,
                debug: "none",
            };
            let f1 = this._gui.addFolder('general');
            f1.add(_obj, "showOutline").onChange((v: boolean) => {
                this._scene.showOutline = v;
            });
            f1.add(_obj, "debug", ["none", "normal", "occlusion", "emissive", "baseColor", "metallic", "roughness", "F0"]).onChange((v: string) => {
                switch (v) {
                    case "none":
                        this._scene.setDebugValue(-1);
                        break;
                    case "normal":
                        this._scene.setDebugValue(0);
                        break;
                    case "occlusion":
                        this._scene.setDebugValue(1);
                        break;
                    case "emissive":
                        this._scene.setDebugValue(2);
                        break;
                    case "baseColor":
                        this._scene.setDebugValue(3);
                        break;
                    case "metallic":
                        this._scene.setDebugValue(4);
                        break;
                    case "roughness":
                        this._scene.setDebugValue(5);
                        break;
                    case "F0":
                        this._scene.setDebugValue(6);
                        break;
                }
            });
        }
        {
            const _camera = this._scene.camera;

            const _obj = {
                notify: (evt?: CG.Event_t) => {
                    const _pos = _camera.position;
                    _cameraObj.positionX = _pos.x;
                    _cameraObj.positionY = _pos.y;
                    _cameraObj.positionZ = _pos.z;
                    return false;
                }
            };
            _camera.addListener(_obj, CG.Camera.CHANGED);

            const _cameraObj = {
                positionX: 0,
                positionY: 0,
                positionZ: 0,
                lookAtSelected: () => {
                    const _r = this._scene.picker.pickedResult;
                    _camera.lookAt(_r?.picked?.mesh.position ?? CG.Vec4.VEC4_0001);
                },
            }
            _obj.notify();
            let f1 = this._gui.addFolder('camera');
            f1.add(_cameraObj, 'positionX').min(-10).max(10).step(0.01).onChange((v: any) => {
                _camera.setPosition(v, _cameraObj.positionY, _cameraObj.positionZ);
            }).listen();
            f1.add(_cameraObj, 'positionY').min(-10).max(10).step(0.01).onChange((v: any) => {
                _camera.setPosition(_cameraObj.positionX, v, _cameraObj.positionZ);
            }).listen();
            f1.add(_cameraObj, 'positionZ').min(-10).max(10).step(0.01).onChange((v: any) => {
                _camera.setPosition(_cameraObj.positionX, _cameraObj.positionY, v);
            }).listen();
            f1.add(_cameraObj, 'lookAtSelected');
        }
        {
            const _pos = this._scene.light.position
            const _color = this._scene.light.color
            const _lightSource = {
                color: [_color.r, _color.g, _color.b],
                intensity: this._scene.light.intensity,
                positionX: _pos.x,
                positionY: _pos.y,
                positionZ: _pos.z,
            }
            let f1 = this._gui.addFolder('light source');
            f1.addColor(_lightSource, 'color').onChange((v: any) => {
                //console.log(v);
                this._scene.light.setColor(v[0], v[1], v[2]);
            });
            f1.add(_lightSource, 'intensity').min(0).max(10).step(0.01).onChange((v: number) => {
                this._scene.light.intensity = v;
            });
            f1.add(_lightSource, 'positionX').min(0).max(100).step(0.01).onChange((v: number) => {
                this._scene.light.setPosition(v, _lightSource.positionY, _lightSource.positionZ);
            });
            f1.add(_lightSource, 'positionY').min(0).max(100).step(0.01).onChange((v: number) => {
                this._scene.light.setPosition(_lightSource.positionX, v, _lightSource.positionZ);
            });
            f1.add(_lightSource, 'positionZ').min(0).max(100).step(0.01).onChange((v: number) => {
                this._scene.light.setPosition(_lightSource.positionX, _lightSource.positionY, v);
            });
        }

        {
            this._scene.picker.addListener({
                notify: (evt: CG.Event_t) => {
                    //const _mesh = this._scene.picker.pickedResult.picked?.mesh;
                    _folderTrans.show();
                    return false;
                }
            }, CG.Picker.PICKED);
            let _data = [0, 0, 0, 0, 0, 0];
            const obj = {
                rotateSlefX: 0, rotateSlefY: 0, rotateSlefZ: 0,
                rotateParentX: 0, rotateParentY: 0, rotateParentZ: 0,
            };
            const _folderTrans = this._gui.addFolder('transformation');
            _folderTrans.hide();
            _folderTrans.add(obj, 'rotateSlefX').min(-360).max(360).step(0.25).onChange((v: number) => {
                //console.log(v);
                this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundSelfX(CG.utils.deg2Rad(v - _data[0]));
                _data[0] = v;
            });
            _folderTrans.add(obj, 'rotateSlefY').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundSelfY(CG.utils.deg2Rad(v - _data[1]));
                _data[1] = v;
            });
            _folderTrans.add(obj, 'rotateSlefZ').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundSelfZ(CG.utils.deg2Rad(v - _data[2]));
                _data[2] = v;
            });
            _folderTrans.add(obj, 'rotateParentX').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundParentX(CG.utils.deg2Rad(v - _data[3]));
                _data[3] = v;
            });
            _folderTrans.add(obj, 'rotateParentY').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundParentY(CG.utils.deg2Rad(v - _data[4]));
                _data[4] = v;
            });
            _folderTrans.add(obj, 'rotateParentZ').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(this._scene.picker.pickedResult.picked?.mesh)?.rotateAroundParentZ(CG.utils.deg2Rad(v - _data[5]));
                _data[5] = v;
            });
        }

        {
            let _folderMaterial = this._gui.addFolder('material');
            let _mat: CG.api_IMaterial;
            this._scene.picker.addListener({
                notify: (evt: CG.Event_t) => {
                    _mat = this._scene.picker.pickedResult?.picked.primitive.material.API;
                    obj.normalTextureScale = _mat.normalTextureScale;
                    obj.occlusionTextureStrength = _mat.occlusionTextureStrength;
                    obj.emissiveFactor = _mat.emissiveFactor;
                    obj.pbrMetallicRoughness.baseColorFactor = _mat.pbrMR_baseColorFactor;
                    obj.pbrMetallicRoughness.metallicFactor = _mat.pbrMR_metallicFactor;
                    obj.pbrMetallicRoughness.roughnessFactor = _mat.pbrMR_roughnessFactor;
                    _folderMaterial.show();

                    return false;
                }
            }, CG.Picker.PICKED);

            const obj = {
                pbrMetallicRoughness: {
                    baseColorFactor: [1, 1, 1, 1],
                    roughnessFactor: 1,
                    metallicFactor: 1,
                },
                normalTextureScale: 1.0,
                occlusionTextureStrength: 1.0,
                emissiveFactor: [0, 0, 0],
            };
            _folderMaterial.hide();
            const _folderPBR = _folderMaterial.addFolder("pbr");
            _folderPBR.open();
            _folderPBR.addColor(obj.pbrMetallicRoughness, 'baseColorFactor').onChange((v: number[]) => {
                _mat.pbrMR_baseColorFactor = v;
            }).listen();
            _folderPBR.add(obj.pbrMetallicRoughness, 'metallicFactor').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.pbrMR_metallicFactor = v;
            }).listen();
            _folderPBR.add(obj.pbrMetallicRoughness, 'roughnessFactor').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.pbrMR_roughnessFactor = v;
            }).listen();
            _folderMaterial.add(obj, 'normalTextureScale').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.normalTextureScale = v;
            }).listen();
            _folderMaterial.add(obj, 'occlusionTextureStrength').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.occlusionTextureStrength = v;
            }).listen();
            _folderMaterial.addColor(obj, 'emissiveFactor').onChange((v: number[]) => {
                _mat.emissiveFactor = v;
            }).listen();

        }
    }
}

