
import { _decorator, NodePool, Node, instantiate, Prefab, Component, CCString } from "cc";
import { pArray } from "../utils";
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
