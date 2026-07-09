
import { _decorator, CCClass, Component, Enum, isValid, js, Node } from 'cc';
import { pConst } from '../../utils';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';

const { ccclass, property } = _decorator;

@ccclass('Handler_Selector')
export class Handler_Selector extends Editor_Smart_SelfFocus {
    @property({ type: Node })
    protected _target: Node = null
    @property({ type: Node })
    get target() { return this._target }
    set target(x) {
        this._target = x;
        this._actUpdateComponentsSelector();
    }

    @property({ type: Component, visible() { return !!this._ref } , readonly: true })
    protected _ref: Component = null

    @property({ visible: pConst.EDITOR_VISIBLE_IN_PREVIEW, readonly: true })
    protected _comp: string = ''
    @property({ type: Enum({}), visible() { return !!this._target } })
    get comp() { return this._comp }
    set comp(x) {
        this._comp = x;
        this._getCompRef();
    }

    @property({ visible: pConst.EDITOR_VISIBLE_IN_PREVIEW, readonly: true })
    protected _zid: string = ''
    @property({ type: Enum({}), visible: false })
    get zid() { return this._zid }
    set zid(x) {
        this._zid = x;
        this._getCompRef();
    }

    getZidOrUuid(target: Node | Component) {
        if(!target) return null
        return target.zid || target.uuid
    }

    @property({})
    protected _handler: string = ''
    @property({ type: Enum({}), visible() { return !!this._target } })
    get handler() { return this._handler }
    set handler(x) {
        this._handler = x;
    }

    protected _getCompRef() {
        if(!this._target || !this._comp) {
            CCClass.Attr.setClassAttr(this, 'zid', 'visible', false);
            return;
        }

        const _list = this._target.getComponents(this._comp);
        if(!_list.length) {
            CCClass.Attr.setClassAttr(this, 'zid', 'visible', false);
            return;
        }

        if(_list.length > 1) {
            this._ref = _list.find(_ => this.getZidOrUuid(_) == this._zid);
            const _zids = _list.map( _ => {
                const _zid = this.getZidOrUuid(_);
                return { name: _zid, value: _zid } 
            });

            CCClass.Attr.setClassAttr(this, 'zid', 'enumList', _zids);
            CCClass.Attr.setClassAttr(this, 'zid', 'visible', true);
        } else {
            this._ref = _list[0];
            CCClass.Attr.setClassAttr(this, 'zid', 'visible', false);
        }
    }

    protected _actUpdateComponentsSelector() {
        if(!this._target) {
            this._ref = null
            return;
        }

        const _comps = this._target.components;
        if(this._ref) {
            if(!_comps.find(_ => _.uuid === this._ref.uuid)) {
                this._ref = null
            } 
        }

        const _ccomps = _comps.map( _ => {
            const _name = js.getClassName(_);
            return { name: _name, value: _name }
        });

        CCClass.Attr.setClassAttr(this, 'comp', 'enumList', _ccomps);
        this._getCompRef();
    }

    protected _actUpdateHandlerSelector() {
        if(!this._target) return;
        if(!this._comp) return;

        const _class = js.getClassByName(this._comp);
        if(!_class) return;
        const _proto = _class.prototype;
        if(!_proto) return;

        const _keys = Object.getOwnPropertyNames(_proto);

        const _list = []
        for(const _key of _keys) {
            if(_key === 'constructor') continue;
            const _desc = Object.getOwnPropertyDescriptor(_proto, _key);
            _desc && typeof _desc.value == 'function' && _list.push({ name: _key, value: _key })
        }

        CCClass.Attr.setClassAttr(this, 'handler', 'enumList', _list);
    }

    focus(): void {
        this._actUpdateComponentsSelector();
        this._getCompRef();
        this._actUpdateHandlerSelector();
    }

    emit(...args: any[]) {
        const _method = this.method;
        if(!_method) return

        _method.method.call(_method.binder, ...args)
    }

    get method(): { method: Function, binder: any } | undefined {
        if(!this.isValid) return

        const _func = this._ref[this._handler]
        if(typeof _func != 'function') return

        return { method: _func, binder: this._ref }
    }

    isValid(deep: boolean = false) {
        let _is = this._ref && isValid(this._ref)
        if(deep) {
            if(!this._target || !isValid(this._target)) _is = false
            else if(!this._target.components.find(_ => _.uuid == this._ref.uuid)) _is = false
        }
        return _is;
    }
}

