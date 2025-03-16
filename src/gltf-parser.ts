import log from "./log.js"
import glC from "./gl-const.js";
import { default as createLoader, ILoader } from "./assets-loader.js"
import { default as Geometry } from "./geometry.js"
import { ITexture, IGeometry, IBuffer, ShaderLocation_e, StepMode_e } from "./types-interfaces.js"
import { Buffer } from "./device-resource.js"
import { Texture } from "./device-resource.js"
import Mesh from "./mesh.js"
import Primitive from "./primitive.js"
import SpacialNode from "./spacial-node.js"
import Material from "./material.js"
import { Mat44, Quat } from "./math.js"

type GLTFScene_t = {
    name?: string;
    nodes: number[],
};
type GLTFNode_t = {
    name?: string;
    children?: number[];
    matrix?: number[];
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    mesh?: number,
    camera?: number,
};
type GLTFPrimitive_t = {
    name?: string;
    mode: number,
    indices?: number,
    attributes: {
        POSITION: number,
        NORMAL?: number,
        TANGENT?: number,
        TEXCOORD_0?: number,
        TEXCOORD_1?: number,
        TEXCOORD_2?: number,
        TEXCOORD_3?: number,
    },
    material?: number,
};
type GLTFBuffer_t = {
    byteLength: number,
    uri: string,
}
type GLTFBufferView_t = {
    buffer: number,
    byteOffset: number,
    byteLength: number,
    byteStride: number,
    target: number,
}
type GLTFAccessor_t = {
    normalized?: boolean,
    bufferView: number,
    byteOffset?: number,
    type: String,
    componentType: number,
    count: number,//The number of elements referenced by this accessor, not to be confused with the number of bytes or number of components.
    min?: number[],
    max?: number[],
}

type GLTFMesh_t = {
    name?: string,
    primitives: GLTFPrimitive_t[],
};

type GLTFv2_t = {
    scene?: number,
    scenes?: GLTFScene_t[],
    nodes?: GLTFNode_t[],
    meshes?: GLTFMesh_t[],
    buffers?: GLTFBuffer_t[],
    bufferViews?: GLTFBufferView_t[],
    accessors?: GLTFAccessor_t[],
    materials?: GLTFMaterial_t[],
    images?: GLTFImage_t[],
    samplers?: GLTFSampler_t[],
    textures?: GLTFTexture_t[],
}

type GLTFMaterial_t = {
    name: string;
    pbrMetallicRoughness?: {
        baseColorTexture: {
            index: number,
            texCoord?: number
        },
        baseColorFactor: number[],
        metallicRoughnessTexture: {
            index: number,
            texCoord?: number
        },
        metallicFactor: number,
        roughnessFactor: number,
    }
    normalTexture: {
        scale: number,
        index: number,
        texCoord?: number,
    },
    occlusionTexture: {
        strength: number,
        index: number,
        texCoord?: number,
    },
    emissiveTexture: {
        index: number,
        texCoord?: number,
    },
    emissiveFactor: number[],
};

type GLTFImage_t = {
    uri?: string,
    //bufferView?: number,// for future support
    //mimeType?: string,// for future support
};

type GLTFSampler_t = {
    magFilter: number,
    minFilter: number,
    wrapS: number,
    wrapT: number,
};

type GLTFTexture_t = {
    source: number,
    sampler: number,
};

export interface IGLTFParser {
}


export type GLTFParserOutput_t = {
    geometrys: IGeometry[],
    CGMeshs: Mesh[],
    SpacialNodes: SpacialNode[],
    CGMaterials: Material[],
}

export default class GLTFParser implements IGLTFParser {

    private _helperMat4: Mat44 = new Mat44();
    private _quat_rotate: Quat = new Quat([0, 0, 0, 0]);
    private _arrBuffers: IBuffer[] = [];
    private _arrData: ArrayBuffer[] = [];
    private _ref_gltf: GLTFv2_t;
    private _ref_accessors: GLTFAccessor_t[];
    private _ref_bufferViews: GLTFBufferView_t[];
    private _output: GLTFParserOutput_t;
    private _baseURL: string;
    private _loader: ILoader;
    private _arrImage: HTMLImageElement[] = [];
    private _arrTexture: ITexture[] = [];

    constructor(deleteAfterParse: boolean = true) {
        this._output = { SpacialNodes: [], geometrys: [], CGMeshs: [], CGMaterials: [] };
    }

    async load(url: string): Promise<GLTFParserOutput_t> {
        const _lIndex = url.lastIndexOf('/');
        this._baseURL = url.substring(0, _lIndex) + '/';
        this._loader = createLoader(this._baseURL);
        const _gltf = await this._loadGLTF(url.substring(_lIndex));
        await this._loadData(_gltf);
        this._parse(_gltf);
        return this._output;
    }

    private _parseNodes(nodes: GLTFNode_t[]): void {
        for (let i = 0, N = nodes.length; i < N; ++i) {
            this._parseNode(i, nodes[i]);
        }

        const _CGNodes = this._output.SpacialNodes;
        for (let i = 0, N = nodes.length; i < N; ++i) {
            let _node = nodes[i];
            if (_node.children) {
                let _pNode = _CGNodes[i];
                for (let j = 0, M = _node.children.length; j < M; ++j) {
                    _pNode.addChildNode(_CGNodes[_node.children[j]]);
                }
            }
        }
    }

    private _parseNode(index: number, node: GLTFNode_t): void {
        let _CGNode: SpacialNode;
        if (node.mesh != undefined) {
            _CGNode = this._output.CGMeshs[node.mesh];
        } else {
            _CGNode = new SpacialNode(node.name);
        }
        this._output.SpacialNodes[index] = _CGNode;

        if (node.matrix) {
            _CGNode.transform.reset(node.matrix, 0, 16);
        } else {
            if (node.translation) {
                Mat44.createTranslate(node.scale[0], node.scale[1], node.scale[2], this._helperMat4);
                _CGNode.transformSelf(this._helperMat4);
            }
            if (node.rotation) {
                this._quat_rotate.reset(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
                //TODO:
                _CGNode.transformSelf(this._helperMat4);
            }
            if (node.scale) {
                Mat44.createScale(node.scale[0], node.scale[1], node.scale[2], this._helperMat4);
                _CGNode.transformSelf(this._helperMat4);
            }
        }
    }

    private _parseTextures(texs: GLTFTexture_t[]): void {
        for (let i = 0, N = texs.length; i < N; ++i) {
            const tex: GLTFTexture_t = texs[i];
            const _img: HTMLImageElement = this._arrImage[tex.source];
            const _out = new Texture(_img.width, _img.height);
            _out.data = _img;
            const _sampler: GLTFSampler_t = this._ref_gltf.samplers[tex.sampler];
            _out.setParameter(glC.TEXTURE_WRAP_S, _sampler.wrapS);
            _out.setParameter(glC.TEXTURE_WRAP_T, _sampler.wrapT);
            _out.setParameter(glC.TEXTURE_MIN_FILTER, _sampler.minFilter);
            _out.setParameter(glC.TEXTURE_MAG_FILTER, _sampler.magFilter);
            this._arrTexture[i] = _out;
        }
    }

    private async _loadGLTF(name: string): Promise<GLTFv2_t> {
        const str = await this._loader.loadText(name)
        return JSON.parse(str)
    }

    private async _loadData(gltf: GLTFv2_t): Promise<void> {
        const buffers: GLTFBuffer_t[] = gltf.buffers;
        for (let i = 0, N = buffers.length; i < N; ++i) {
            let _data = await this._loader.loadBinary(buffers[i].uri);
            if (!!_data) this._arrData[i] = _data;
        }

        const imgs: GLTFImage_t[] = gltf.images;
        for (let i = 0, N = imgs?.length ?? 0; i < N; ++i) {
            let _data = await this._loader.loadTexture(imgs[i].uri);
            if (!!_data) this._arrImage[i] = _data;
        }
    }

    private _parse(gltf: GLTFv2_t): void {
        this._ref_gltf = gltf;
        this._ref_accessors = gltf.accessors;
        this._ref_bufferViews = gltf.bufferViews;
        gltf.textures && this._parseTextures(gltf.textures);
        this._parseMaterials(gltf.materials);
        gltf.meshes && this._parseMeshes(gltf.meshes);
        gltf.nodes && this._parseNodes(gltf.nodes);
    }

    private _parseMaterials(materials: GLTFMaterial_t[]): void {
        if (materials?.length <= 0) return;

        let _mat: Material;
        let _matProp: GLTFMaterial_t;
        for (let i = 0, N = materials.length; i < N; ++i) {
            _matProp = materials[i];
            _mat = new Material(_matProp.name);
            if (_mat._albedoTexture = this._arrTexture[_matProp.pbrMetallicRoughness?.baseColorTexture?.index])
                _mat._albedoTexture.UVIndex = _matProp.pbrMetallicRoughness?.baseColorTexture?.texCoord;
            if (_mat._normalTexture = this._arrTexture[_matProp.normalTexture?.index])
                _mat._normalTexture.UVIndex = _matProp.normalTexture?.texCoord;
            _mat._normalTextureScale = _matProp.normalTexture?.scale ?? 1.0;
            _mat._occlusionTexture = this._arrTexture[_matProp.occlusionTexture?.index];
            _mat._occlusionTextureStrength = _matProp.occlusionTexture?.strength ?? 1.0;
            _mat._emissiveTexture = this._arrTexture[_matProp.emissiveTexture?.index];
            if (_matProp.emissiveFactor) {
                _mat._emissiveTextureFactor[0] = _matProp.emissiveFactor[0];
                _mat._emissiveTextureFactor[1] = _matProp.emissiveFactor[1];
                _mat._emissiveTextureFactor[2] = _matProp.emissiveFactor[2];
            }

            this._output.CGMaterials[i] = _mat;
        }
    }

    private _parseMeshes(meshes: GLTFMesh_t[]): void {
        if (meshes?.length <= 0) return;

        for (let i = 0, N = meshes.length; i < N; ++i) {
            let _mesh = this._parseMesh(meshes[i]);
            this._output.CGMeshs[i] = _mesh;
        }
    }

    private _parseMesh(mesh: GLTFMesh_t): Mesh {
        const _mesh: Mesh = new Mesh(mesh.name);
        for (let i = 0, N = mesh.primitives.length; i < N; ++i) {
            let _primitive = this._parsePrimitive(mesh.primitives[i]);
            _mesh.addPrimitive(_primitive);
        }
        return _mesh;
    }

    private _parsePrimitive(primitive: GLTFPrimitive_t): Primitive {
        const _geo: IGeometry = new Geometry();
        let _acc;
        let _buf: IBuffer;
        let _attrib: Attribute_t;

        // attributes;
        _acc = this._ref_accessors[primitive.attributes.POSITION];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _buf = this._getBuffer(_bv, _acc);
            _attrib = this._getAttribute(_bv, _acc);
            _buf.setAttribute(ShaderLocation_e.ATTRIB_POSITION, _attrib.size, _attrib.type, _attrib.normalized, _attrib.offset);
            _geo.addVertexBuffer(_buf);
        }

        _acc = this._ref_accessors[primitive.attributes.NORMAL];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _buf = this._getBuffer(_bv, _acc);
            _attrib = this._getAttribute(_bv, _acc);
            _buf.setAttribute(ShaderLocation_e.ATTRIB_NORMAL, _attrib.size, _attrib.type, _attrib.normalized, _attrib.offset);
            _geo.addVertexBuffer(_buf);
        }

        _acc = this._ref_accessors[primitive.attributes.TANGENT];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _buf = this._getBuffer(_bv, _acc);
            _attrib = this._getAttribute(_bv, _acc);
            _buf.setAttribute(ShaderLocation_e.ATTRIB_TANGENT, _attrib.size, _attrib.type, _attrib.normalized, _attrib.offset);
            _geo.addVertexBuffer(_buf);
        }

        for (let i = 0, N = 5; i < N; ++i) {
            //@ts-ignore;
            _acc = this._ref_accessors[primitive.attributes[`TEXCOORD_${i}`]];
            if (_acc) {
                const _bv = this._ref_bufferViews[_acc.bufferView];
                _buf = this._getBuffer(_bv, _acc);
                _attrib = this._getAttribute(_bv, _acc);
                _buf.setAttribute(ShaderLocation_e.ATTRIB_TEXTURE_UV_0 + i, _attrib.size, _attrib.type, _attrib.normalized, _attrib.offset);
                _geo.addVertexBuffer(_buf);
            }
        }

        // indices;
        _acc = this._ref_accessors[primitive.indices];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            if (_bv) {
                _buf = this._getBuffer(_bv, _acc);
                _geo.setIndexBuffer(_buf);
                _geo.setDrawElementsParameters(primitive.mode, _acc.count, _acc.componentType, 0);
            } else {
                log.warn("[GLTFParser] index accessor exist, but NO buffer view!");
            }
        } else {
            _geo.setDrawArraysParameters(primitive.mode, 0, _acc.count);
        }
        const _primitive: Primitive = new Primitive(primitive.name, _geo);
        _primitive.material = this._output.CGMaterials[primitive.material];
        return _primitive;
    }

    private _getBuffer(bv: GLTFBufferView_t, accessor: GLTFAccessor_t): IBuffer {
        let _buf = this._arrBuffers[accessor.bufferView];
        if (!_buf) {
            _buf = new Buffer(bv.target);
            if (accessor.componentType === glC.FLOAT) {
                _buf.setData(new Float32Array(this._arrData[bv.buffer], bv.byteOffset, bv.byteLength / 4));
            } else if (accessor.componentType === glC.UNSIGNED_INT) {
                _buf.setData(new Uint32Array(this._arrData[bv.buffer], bv.byteOffset, bv.byteLength / 4));
            } else if (accessor.componentType === glC.UNSIGNED_BYTE) {
                _buf.setData(new Uint8Array(this._arrData[bv.buffer], bv.byteOffset, bv.byteLength));
            }
            _buf.setStrideAndStepMode(bv.byteStride, StepMode_e.vertex);

            this._arrBuffers[accessor.bufferView] = _buf;
        }
        return _buf;
    }

    private _getAttribute(bv: GLTFBufferView_t, accessor: GLTFAccessor_t): Attribute_t {
        return {
            //@ts-ignore
            size: accessorTypeToNumber[accessor.type],
            type: accessor.componentType,
            normalized: accessor.normalized ?? false,
            offset: accessor.byteOffset ?? 0,
        }
    }
}

//@ts-ignore
window.parseGLTF = GLTFParser;

type Attribute_t = {
    size: number;
    type: number;
    normalized: boolean;
    offset: number
}

const accessorTypeToNumber = Object.freeze({
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
});
