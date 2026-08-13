
import { CCInteger, Prefab, Node, UITransform, _decorator, Vec3, JsonAsset, RigidBody2D, Vec2, randomRange } from 'cc'
import { pConst, pEngine, pMath } from '../../utils';
import { editor_property } from '../../utils/pClass';
import { Pooler_Node } from '../../pooler/Pooler.Node';

const { ccclass, property } = _decorator;

const _pool = Pooler_Node.create();

@ccclass("Helper_Spawner")
export class Helper_Spawner {
    @property({ type: UITransform, group: pConst.GROUPS.CORE })
    rect: UITransform = null

    @property({ type: [Prefab], group: pConst.GROUPS.CORE })
    fabs: Prefab[] = []

    @property({ type: Node, group: pConst.GROUPS.CORE })
    papa: Node = null;

    @property({ group: pConst.GROUPS.CORE })
    isDisconnectClonerWithFab: boolean = true;

    @property({ type: CCInteger, min: 0, group: pConst.GROUPS.CORE })
    intWarmUpAmount: number = 0;

    @property({ min: 1, type: CCInteger, group: pConst.GROUPS.CORE })
    intSpawnAmountPerInterval: number = 1;

    @property({ group: pConst.GROUPS.CORE })
    isOverridingScale: boolean = false;

    @property({ visible() { return this.isOverridingScale }, group: pConst.GROUPS.CORE })
    scaler: Vec3 = new Vec3(1, 1, 1);

    @editor_property(Pooler_Node)
    get pool() { return _pool }

    @property({ type: JsonAsset, group: pConst.GROUPS.CORE })
    evtRecycle: JsonAsset = null;

    @property({ type: JsonAsset, group: pConst.GROUPS.CORE })
    evtAutoRecycle: JsonAsset = null

    init() {
        this.actWarnUp();
        pEngine.Json.event.add(this.evtRecycle, { func: this._onRecycle, binder: this });
        pEngine.Json.event.add(this.evtAutoRecycle, { func: this._onRecycleAll, binder: this } )
    }

    protected _onRecycleAll() {
        _pool.puts(this.papa.children);
    }

    protected _onRecycle(target: { node: Node }) {
        if(!target.node && target.node instanceof Node) return;
        _pool.put(target.node);
    }

    actWarnUp(amount: number = this.intWarmUpAmount) {
        for (let i = 0; i < amount; i++) {
            const _node = pEngine.NodeUtils.create({
                name: _ => _.name + `__${i}`,
                fab: pMath.rand(this.fabs),
                pos: {
                    x: 0, y: 0, z: 0,
                    isWorldPos: false
                },
                isDisconnectPrefabLink: this.isDisconnectClonerWithFab,
            })
            _pool.put(_node.node);
        }
    }

    spawn() {
        if (!this.rect) return;

        const _width = this.rect.width;
        const _height = this.rect.height;
        const _anchor = this.rect.anchorPoint;

        for (let i = 0; i < this.intSpawnAmountPerInterval; i++) {
            const _localX = randomRange(-_anchor.x * _width, (1 - _anchor.x) * _width);
            const _localY = randomRange(-_anchor.y * _height, (1 - _anchor.y) * _height);

            const _worldPos = this.rect.convertToWorldSpaceAR(new Vec3(_localX, _localY, 0));

            const _node = _pool.get() || pEngine.NodeUtils.create({
                name: _ => _.name + `__${i}`,
                fab: pMath.rand(this.fabs),
                isDisconnectPrefabLink: this.isDisconnectClonerWithFab,
            }).node

            pEngine.NodeUtils.setPosition(_node, { position: _worldPos, isWorldPos: true });
            _node.setParent(this.papa, true);

            const _rigid = _node.getComponent(RigidBody2D);
            if(!!_rigid) {
                _rigid.linearVelocity = Vec2.ZERO.clone();
                _rigid.angularVelocity = 0;
            }
            this.isOverridingScale && _node.setScale(this.scaler);
        }
    }
}
