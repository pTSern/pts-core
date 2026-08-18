
import { CCInteger, Prefab, Node, UITransform, _decorator, Vec3, JsonAsset, RigidBody2D, Vec2, randomRange, Rect, IRectLike, js, Pool } from 'cc'
import { pConst, pEngine, pMath } from '../../utils';
import { editor_property } from '../../utils/pClass';
import { Pooler_Node } from '../../pooler/Pooler.Node';
import { Helper_IdSelector } from '../Helper.IdSelector';

const { ccclass, property } = _decorator;

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

    @property({ group: pConst.GROUPS.CORE, type: Helper_IdSelector })
    pooler: Helper_IdSelector = new Helper_IdSelector();

    @editor_property(Pooler_Node)
    get pool() { return Pooler_Node.pool(this.pooler.sid) }

    @property({ type: JsonAsset, group: pConst.GROUPS.CORE })
    evtRecycle: JsonAsset = null;

    @property({ type: JsonAsset, group: pConst.GROUPS.CORE })
    evtAutoRecycle: JsonAsset = null

    init() {
        this.actWarnUp();
        pEngine.Json.event.add(this.evtRecycle, { func: this._onRecycle, binder: this });
        pEngine.Json.event.add(this.evtAutoRecycle, { func: this._onRecycleAll, binder: this } )
    }

    destroy() {
        pEngine.Json.event.remove(this.evtRecycle, { func: this._onRecycle, binder: this });
        pEngine.Json.event.remove(this.evtAutoRecycle, { func: this._onRecycleAll, binder: this } )
    }

    protected _onRecycleAll() {
        this.pool.puts(this.papa.children);
    }

    protected _onRecycle(target: { node: Node }) {
        if(!target.node && target.node instanceof Node) return;
        this.pool.put(target.node);
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
            this.pool.put(_node.node);
        }
    }

    spawn() {
        Pooler_Node.spawn(this.rect, this.intSpawnAmountPerInterval, {
            fab: this.fabs,
            parent: this.papa,
            isDisconnectPrefabLink: this.isDisconnectClonerWithFab,
            scale: this.isOverridingScale ? this.scaler : null
        }, _node => {
            const _rigid = _node.getComponent(RigidBody2D);
            if(!!_rigid) {
                _rigid.linearVelocity = Vec2.ZERO.clone();
                _rigid.angularVelocity = 0;
            }
        })
    }
}
