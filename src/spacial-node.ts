//import log from "./log.js"
import OrthogonalSpace from "./orthogonal-space.js"
import { roMat44, Mat44 } from "./math.js"

export default class SpacialNode extends OrthogonalSpace {

    public name: string;
    private _modelMatrix: Mat44 = new Mat44().setIdentity();
    protected _parentNode: SpacialNode;
    protected _childrenNodes: Set<SpacialNode> = new Set();

    constructor(name?: string) {
        super();
        this.name = name ?? "";
    }

    get modelMatrix(): roMat44 {
        //todo: if rendered in parent to desendent order, then rootTransform may calculated many times, which is cpu wasting.
        if (this._parentNode) {
            this._parentNode.modelMatrix.multiply(this._transform, this._modelMatrix);
            return this._modelMatrix;
        } else {
            return this._transform;
        }
    }

    get parentModelMatrix(): roMat44 {
        return this._parentNode?.modelMatrix ?? Mat44.IdentityMat44;
    }

    addChildNode(mesh: SpacialNode): void {
        this._childrenNodes.add(mesh);
        mesh._parentNode = this;
    }

    removeChildNode(mesh: SpacialNode): boolean {
        const _exist = this._childrenNodes.delete(mesh);
        _exist && (mesh._parentNode = undefined);
        return _exist;
    }

    removeChildNodes(): void {
        this._childrenNodes.forEach(m => {
            m._parentNode = undefined;
        });
        this._childrenNodes.clear();
    }

}
