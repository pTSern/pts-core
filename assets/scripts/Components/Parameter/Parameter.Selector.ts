
import { _decorator, CCClass, Component, Enum, isValid, js, Node } from 'cc';
import { pClass, pConst, pEngine, pGlobal, pObject } from '../../utils';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';

const { ccclass, property } = _decorator;

@ccclass('Parameter_Selector')
export class Parameter_Selector extends Editor_Smart_SelfFocus {
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
    protected _param: string[] = []
    @property({ type: Enum({}), visible() { return !!this._target } })
    get parameter() { return this._param }
    set parameter(x) {
        this._param = x;
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

    protected _actUpdateParameterSelector() {
        if(!this._target) return;
        if(!this._comp) return;

        const _class = js.getClassByName(this._comp);
        if(!_class) return;
        const _params = pClass.actExtractProp(_class);

        console.log('Parameter_Selector._actUpdateParameterSelector', _params)
        const _list = []
        for(const _key of _params) {
            if(_key === 'constructor') continue;
            if(pObject.isWriteOnlyProperty(_class, _key)) continue;

            _list.push({ name: _key, value: _key })
        }

        CCClass.Attr.setClassAttr(this, 'parameter', 'enumList', _list);
    }

    focus(): void {
        this._actUpdateComponentsSelector();
        this._getCompRef();
        this._actUpdateParameterSelector();
    }

    get data() {
        if(!this.isValid) return

        const _out = []
        for(const _param of this._param) {
            const _val = this._ref[_param]
            if(typeof _val == 'function') continue
            _out.push(_val);
        }
        return _out;
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
