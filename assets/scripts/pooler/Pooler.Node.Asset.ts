import { Prefab, Node, __private, _decorator, instantiate, Component, CCClass, js, CCInteger, NodePool } from "cc";
import { pArray, pClass, pConst, pEngine, pGlobal, pObject, pTSAsset } from "../utils";
import { editor_property, implement } from "../utils/pClass";
import { CC_IEnumList } from "../interfaces/cc/CC.IEnumable";

const { ccclass, property } = _decorator;

@implement(NodePool)
@ccclass("Pooler_Node_Asset")
@pTSAsset.menu("Pooler/Node")
export class Pooler_Node_Asset extends pTSAsset implements NodePool {

    @property({ type: CCInteger, min: 0 })
    warm: number = 0

    @property({ type: Prefab, visible: true })
    protected template: Prefab = null

    @property({ min: 0, tooltip: "In mms" })
    timeBudgetMs: number = 16

    protected _pool: Node[] = []
    @editor_property()
    protected get _size() { return this._pool.length }

    @property({ type: pConst.ENUM, visible: true })
    protected _poolHandlerComp: string = "None"
    @property({ type: pConst.ENUM, visible: true })
    protected _reuseHandler: string = "reuse"
    @property({ type: pConst.ENUM, visible: true })
    protected _unuseHandler: string = "reuse"

    poolHandlerComp?: pFlex.TCtor<Component> = null

    get template_uuid(): string {
        return this.template?.uuid
    }

    onFocusInEditor(): void {
        const _all = pClass.getAllCCClasses('AllComponents');
        const _arr = ["None", ...Array.from(_all)]
        const _cc = CC_IEnumList.generator(_arr)
        CCClass.Attr.setClassAttr(this, '_poolHandlerComp', 'enumList', _cc);
        const _class = js.getClassByName(this._poolHandlerComp)
        if(!_class) {
            CCClass.Attr.setClassAttr(this, '_reuseHandler', 'visible', false);
            CCClass.Attr.setClassAttr(this, '_unuseHandler', 'visible', false);
            return;
        }
        CCClass.Attr.setClassAttr(this, '_reuseHandler', 'visible', true);
        CCClass.Attr.setClassAttr(this, '_unuseHandler', 'visible', true);
        const _func = pObject.getAllMethodNames(_class.prototype)
        const _enum = CC_IEnumList.generator(_func)
        CCClass.Attr.setClassAttr(this, '_reuseHandler', 'enumList', _enum);
        CCClass.Attr.setClassAttr(this, '_unuseHandler', 'enumList', _enum);
    }

    protected _onLoad(): void {
        if(this._poolHandlerComp === "None") return;
        this.poolHandlerComp = js.getClassByName(this._poolHandlerComp)
    }

    protected _onAwake(): void | Promise<void> {
        this.generate(this.warm);
    }

    async generate(amount: number, timeBudgetMs: number = this.timeBudgetMs) {
        if(!this.template || amount < 0) return;

        let created = 0
        while(created < amount) {
            const _frame = performance.now();

            while(created < amount && performance.now() - _frame < timeBudgetMs) {
                const _node = instantiate(this.template);
                this.put(_node);
                created++;
            }

            if(created < amount) {
                await pEngine.yeildAnimationFrame();
            }
        }
    }

    puts(obj: pFlex.TArray<Node>, ...objs: Node[]) {
        objs = pArray.flatter(obj, ...objs);

        objs.forEach(_ => this.put(_))
    }

    gets(amount: number = 1, ...args: any[]) {
        amount = Math.abs(amount);
        if(amount === 0) return []

        const _last = this._pool.length - 1;
        if(_last < 0) return [];

        const _arr = []
        const _reach = _last - amount + 1;

        for(let i = _last; i >= _reach; i--) {
            const _obj = this._pool[i];
            _arr.push(_obj);

            const _handler = this.poolHandlerComp ? _obj.getComponent(this.poolHandlerComp) : null
            if(_handler && _handler[this._reuseHandler]) {
                _handler[this._reuseHandler](...args);
            }
        }

        this._pool.length = _reach;
        return _arr;
    }

    get(...args: any[]): Node | null {
        let node: Node | null = null;
        if(this._pool.length > 0) {
            node = this._pool.pop();
        } else if(this.template) {
            node = instantiate(this.template);
        } else return null

        const handler = this.poolHandlerComp ? node.getComponent(this.poolHandlerComp) : null
        if(handler && handler[this._reuseHandler]) {
            handler[this._reuseHandler](...args);
        }

        pGlobal.log({ group: "Pooler", level: "DEV" }, `[Pooler_Node_Asset] get node: ${node.name}, pool size: ${this._pool.length}`);
        return node;
    }

    put(node: Node): void {
        if(node && this._pool.indexOf(node) === -1) {
            node.removeFromParent()
            const _handler = this.poolHandlerComp ? node.getComponent(this.poolHandlerComp) : null
            if(_handler && _handler[this._unuseHandler]) {
                _handler[this._unuseHandler]();
            }
            this._pool.push(node);
        }
    }

    size(): number {
        return this._pool.length;
    }

    clear() {
        const count = this._pool.length;
        for(let i = 0; i < count; i++) {
            this._pool[i].destroy();
        }
        this._pool.length = 0;
    }
}
