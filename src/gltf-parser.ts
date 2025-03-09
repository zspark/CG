import log from "./log.js"
import { default as createLoader, ILoader } from "./assets-loader.js"
import { default as Geometry } from "./geometry.js"
import { IGeometry, IBuffer, ShaderLocation_e, StepMode_e } from "./types-interfaces.js"
import { Buffer } from "./device-resource.js"
import { GLBuffer } from "./webgl.js"
import Mesh from "./mesh.js"
import SpacialNode from "./spacial-node.js"
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
    mode: number,
    indices?: number,
    attributes: {
        POSITION: number,
        NORMAL?: number,
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
}

export interface IGLTFParser {
}


export type GLTFParserOutput_t = {
    CGMeshs: Mesh[],
    geometrys: IGeometry[],
    SpacialNodes: SpacialNode[],
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

    constructor(deleteAfterParse: boolean = true) {
        this._output = { SpacialNodes: [], geometrys: [], CGMeshs: [] }
    }

    async load(url: string): Promise<GLTFParserOutput_t> {
        const _lIndex = url.lastIndexOf('/');
        this._baseURL = url.substring(0, _lIndex) + '/';
        this._loader = createLoader(this._baseURL);
        const _gltf = await this._loadGLFT(url.substring(_lIndex));
        await this._loadData(_gltf.buffers);
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
            _CGNode = new Mesh(node.name);
            (_CGNode as Mesh).geometry = this._output.geometrys[node.mesh];
            this._output.CGMeshs.push(_CGNode as Mesh);
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

    private async _loadGLFT(name: string): Promise<GLTFv2_t> {
        const str = await this._loader.loadText(name)
        return JSON.parse(str)
    }

    private async _loadData(buffers: GLTFBuffer_t[]): Promise<void> {
        for (let i = 0, N = buffers.length; i < N; ++i) {
            let _data = await this._loader.loadBinary(buffers[i].uri);
            if (!!_data) this._arrData[i] = _data;
        }
    }

    private _parse(gltf: GLTFv2_t): void {
        this._ref_gltf = gltf;
        this._ref_accessors = gltf.accessors;
        this._ref_bufferViews = gltf.bufferViews;
        gltf.meshes && this._parseMeshes(gltf.meshes);
        gltf.nodes && this._parseNodes(gltf.nodes);
    }

    private _parseMeshes(meshes: GLTFMesh_t[]): void {
        if (meshes?.length <= 0) return;

        for (let i = 0, N = meshes.length; i < N; ++i) {
            let _geo = this._parseMesh(meshes[i]);
            this._output.geometrys[i] = _geo;
        }
    }

    private _parseMesh(mesh: GLTFMesh_t): IGeometry {
        const _geo: IGeometry = new Geometry();
        for (let i = 0, N = mesh.primitives.length; i < N; ++i) {
            this._parsePrimitive(_geo, mesh.primitives[i]);
        }
        return _geo;
    }

    private _parsePrimitive(geo: IGeometry, primitive: GLTFPrimitive_t): void {
        let _acc;
        /*
        _acc = this._ref_accessors[primitive.indices];
        if (_acc) {
        }
        */

        let _buf: IBuffer;
        let _attrib: Attribute_t;
        _acc = this._ref_accessors[primitive.attributes.POSITION];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _buf = this._getBuffer(_bv, _acc);
            _attrib = this._getAttribute(_bv, _acc);
            _buf.setAttribute(ShaderLocation_e.ATTRIB_POSITION, _attrib.size, _attrib.type, _attrib.normalized, _attrib.offset);
        }

        _acc = this._ref_accessors[primitive.attributes.NORMAL];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _buf = this._getBuffer(_bv, _acc);
            _attrib = this._getAttribute(_bv, _acc);
            _buf.setAttribute(ShaderLocation_e.ATTRIB_NORMAL, _attrib.size, _attrib.type, _attrib.normalized, _attrib.offset);
        }
        geo.addVertexBuffer(_buf);

        _acc = this._ref_accessors[primitive.indices];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            if (_bv) {
                _buf = this._getBuffer(_bv, _acc);
                geo.setIndexBuffer(_buf);
                geo.setDrawElementsParameters(primitive.mode, _acc.count, _acc.componentType, 0);
            } else {
                log.warn("[GLTFParser] index accessor exist, but NO buffer view!");
            }
        } else {
            geo.setDrawArraysParameters(primitive.mode, 0, _acc.count);
        }

    }

    private _getBuffer(bv: GLTFBufferView_t, accessor: GLTFAccessor_t): IBuffer {
        let _buf = this._arrBuffers[accessor.bufferView];
        if (!_buf) {
            _buf = new GLBuffer(bv.target);
            if (accessor.componentType === 5126) {/// float;
                _buf.setData(new Float32Array(this._arrData[bv.buffer], bv.byteOffset, bv.byteLength / 4));
            } else if (accessor.componentType === 5125) {/// UNSIGNED_INT;
                _buf.setData(new Uint32Array(this._arrData[bv.buffer], bv.byteOffset, bv.byteLength / 4));
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
