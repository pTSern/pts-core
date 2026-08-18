
import { _decorator, NodePool, Node, instantiate, Prefab, Component, CCString, js, UITransform, randomRange, Vec3 } from "cc";
import { pArray, pEngine } from "../utils";
import { editor_ccclass, editor_property } from "../utils/pClass";

interface _IHandler {
    unuse: pFlex.TFunc<void, void>
    reuse: pFlex.TFunc<[any], void>
}

interface _IOpt {
    comp?: pFlex.TCtor<_IHandler> | string
    template: Prefab;
    batch?: number
}

type _TSpawnOpt = { pooler?: pFlex.TKey } & Parameters<typeof pEngine.NodeUtils.create>[0]

@editor_ccclass("Pooler_Node")
export class Pooler_Node extends NodePool {
    @editor_property(Prefab)
    protected _template: Prefab = null

    @editor_property([CCString])
    protected get __see_pool() {
        return this.__pool_.map(_ => _.name);
    }

    protected get __pool_(): Node[] { 
        return this['_pool'];
    }

    static create(opt?: _IOpt) {
        const _ret = new Pooler_Node(opt?.comp || null);
        _ret._template = opt?.template || null
        typeof opt?.batch === 'number' && _ret.generate(opt.batch);
        return _ret;
    }

    static Event = {
        RECYCLE: '$_NODE_RECYCLE'
    }

    static spawn(rect: UITransform, amount: number, opt: _TSpawnOpt, act?: pFlex.TFunc<[Node], void>) {
        const { width, height, anchorPoint  } = rect;
        const _pool = Pooler_Node.pool(opt.pooler);
        const _nodes: Node[] = []

        for (let i = 0; i < amount; i++) {
            const _localX = randomRange(-anchorPoint.x * width, (1 - anchorPoint.x) * width);
            const _localY = randomRange(-anchorPoint.y * height, (1 - anchorPoint.y) * height);

            const _worldPos = rect.convertToWorldSpaceAR(new Vec3(_localX, _localY, 0));
            console.log('Pooler_Node.spawn', _worldPos, _localX, _localY, width, height, anchorPoint);

            const _node = _pool.get() || pEngine.NodeUtils.create(opt).node;
            _node.once(Pooler_Node.Event.RECYCLE, _ => _pool.put(_node));
            opt.parent && (_node?.parent?.uuid && _node.parent.uuid !== opt.parent.uuid) && opt.parent.addChild(_node);
            _node.setWorldPosition(_worldPos);

            act && act(_node);
            _nodes.push(_node);
        }
        return _nodes;
    }

    private static _$pool: Record<pFlex.TKey, Pooler_Node> = js.createMap(true);
    private static _$shared: pFlex.TKey = Symbol('Pooler_Node.shared')
    static pool(key?: pFlex.TKey) {
        if(!key) key = Pooler_Node._$shared;
        let _ret = Pooler_Node._$pool[key];

        if(!_ret) {
            _ret = Pooler_Node._$pool[key] = new Pooler_Node();
        }

        return _ret;
    }

    template(_template: Prefab) {
        this._template = _template;
    }

    generate(amount: number, template?: Prefab) {
        template = template || this._template;
        if(!template) return;

        for(let i = 0; i < amount; i ++) {
            const _node = instantiate(this._template);
            this.put(_node);
        }
    }

    puts(obj: pFlex.TArray<Node>, ...objs: Node[]) {
        objs = pArray.flatter(obj, ...objs);

        objs.forEach(_ => this.put(_))
    }

    gets(amount: number = 1, ...args: any[]) {
        amount = Math.abs(amount);
        if(amount === 0) return []

        const _last = this.__pool_.length - 1;
        if(_last < 0) return [];

        const _arr = []
        const _reach = _last - amount + 1;

        for(let i = _last; i >= _reach; i--) {
            const _obj = this.__pool_[i];
            _arr.push(_obj);

            const _handler = this.poolHandlerComp ? _obj.getComponent(this.poolHandlerComp as pFlex.TCtor<any, Component>) : null
            if(_handler && _handler['reuse']) {
                _handler['reuse'](...args);
            }
        }

        this.__pool_.length = _reach;

        return _arr;

    }
}

