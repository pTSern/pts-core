import { _decorator, Node, CCClass, Component, Enum, js, Asset, assetManager } from 'cc';
import { pClass, pConst, pEngine } from '../../utils';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';
import { CC_EnumList } from '../../interfaces/cc/CC.IEnumable';

const { ccclass, property } = _decorator;

export namespace Helper_Param_Creator {
    export type IData<_T = any> = {
        data: _T;
        type: string;
    }
}

@ccclass('Helper_Param_Creator')
export class Helper_Param_Creator extends Editor_Smart_SelfFocus {
    @property({  })
    get log() { return false }
    set log(x) {
        if(!x) return;
        console.log(JSON.stringify(this.extract(), null, 4))
    }
    @property({})
    protected _filter: pClass.ETypes = 'cc.Component';

    @property({ type: pClass.ETypes })
    get filter(): pClass.ETypes {
        return this._filter;
    }
    set filter(x: pClass.ETypes) {
        if (this._filter === x) return;
        this._filter = x;
        this.focus();
    }

    @property({})
    protected _type: string = '';

    @property({
        type: Enum({}),
        visible(this: Helper_Param_Creator) {
            return this._filter !== 'cc.Node';
        }
    })
    get type(): string { return this._type }
    set type(x: string) {
        if (this._type === x) return;

        this._type = x;
        this.focus();
    }

    @property({})
    protected _isArray: boolean = false;

    @property({})
    get isArray(): boolean { return this._isArray }
    set isArray(x: boolean) {
        if (this._isArray === x) return;

        this._isArray = x;
        this.focus();
    }

    @property({ visible: true })
    protected _data: any = null;

    get data(): any {
        return this._data;
    }

    static read(list: Helper_Param_Creator.IData[]) {
        const _total: Helper_Param_Creator[] = [];
        for(const _data of list) {
            const { type, data } = _data;
            if(!type) continue;

            switch(type) {
                case 'cc.Node': {
                    const _ret = new Helper_Param_Creator();
                    _ret.filter = 'cc.Node';
                    if(data) _ret._data = Array.isArray(data) ? data.map(_ => pEngine.NodeUtils.lookup(_)) : pEngine.NodeUtils.lookup(data)
                     else _ret._data = null
                    _total.push(_ret);
                    break;
                }
                case 'CCString':
                case 'CCFloat':
                case 'CCBoolean': {
                    const _ret = new Helper_Param_Creator();
                    _ret.filter = 'Primitive';
                    _ret.type = type;
                    _ret._data = data;

                    _total.push(_ret);
                    break;
                }
                default: {
                    const _class = js.getClassByName(type);
                    if(!_class) continue;

                    const _ret = new Helper_Param_Creator();
                    _ret.filter = 'All';
                    _ret.type = type;

                    if(pClass.isInheritedFrom(Asset, _class)) {
                        assetManager.bundles.forEach(_ => {
                            const _data = _.getAssetInfo(data);
                            if(!_data) return;
                            if(!_data['path']) return;

                            _.load(_data['path'], (e, o) => {
                                if(!e) _ret._data = o
                            })
                        })

                    }

                    _total.push(_ret);
                    break;
                }
            }
        }
        return _total;
    }

    focus(): void {
        switch (this._filter) {
            case 'cc.Node':
                this._onFocusNode();
                break;
            case 'Primitive':
                this._onFocusPrimitive();
                break;
            default:
                this._onFocusClass();
                break;
        }
    }

    private _onFocusNode(): void {
        CCClass.Attr.setClassAttr(this, '_data', 'type', 'Object');
        CCClass.Attr.setClassAttr(this, '_data', 'ctor', Node);

        if (this._isArray) {
            CCClass.Attr.setClassAttr(this, '_data', 'default', pConst.ARRAY_FUNC);

            this._data = Array.isArray(this._data)
                ? this._data.filter((item) => item instanceof Node || item === null)
                : [];
        } else {
            CCClass.Attr.setClassAttr(this, '_data', 'default', null);

            if (!(this._data instanceof Node)) {
                this._data = null;
            }
        }
    }

    private _onFocusPrimitive(): void {
        CCClass.Attr.setClassAttr(this, 'type', 'enumList', pClass.CCEPrimitive);
        CCClass.Attr.setClassAttr(this, '_data', 'ctor', null);

        let _info = pClass.getPrimitiveType(this._type as pClass.EPrimitive);
        if (!_info) {
            this._type = 'CCString';
            _info = pClass.getPrimitiveType('CCString')!;
        }

        CCClass.Attr.setClassAttr(this, '_data', 'type', _info.type);

        if (this._isArray) {
            CCClass.Attr.setClassAttr(this, '_data', 'default', pConst.ARRAY_FUNC);
            this._data = Array.isArray(this._data)
                ? this._data.filter((item) => typeof item === typeof _info.default)
                : [];
        } else {
            CCClass.Attr.setClassAttr(this, '_data', 'default', _info.default);
            if (typeof this._data !== typeof _info.default) {
                this._data = _info.default;
            }
        }
    }

    private _onFocusClass(): void {
        const _classes = pClass.getAllCCClasses(this._filter);
        const _EList = CC_EnumList(Array.from(_classes));

        CCClass.Attr.setClassAttr(this, 'type', 'enumList', _EList);

        let _class = js.getClassByName(this._type);
        if (!_class) {
            const firstClass = _classes.values().next().value;
            if (firstClass) {
                this._type = firstClass;
                _class = js.getClassByName(this._type);
            }
        }

        if (!_class) return;

        CCClass.Attr.setClassAttr(this, '_data', 'type', 'Object');
        CCClass.Attr.setClassAttr(this, '_data', 'ctor', _class);

        const isComponent = pClass.isInheritedFrom(Component, _class);

        if (this._isArray) {
            CCClass.Attr.setClassAttr(this, '_data', 'default', pConst.ARRAY_FUNC);
            this._data = Array.isArray(this._data)
                ? this._data.filter((item) => item instanceof _class || item === null)
                : [];
        } else {
            const _val = isComponent ? null : function () { return new _class(); };
            CCClass.Attr.setClassAttr(this, '_data', 'default', _val);

            if (!(this._data instanceof _class)) {
                if (isComponent) {
                    this._data = null;
                } else {
                    try {
                        this._data = new (_class as any)();
                    } catch {
                        this._data = null;
                    }
                }
            }
        }
    }

    protected _extract(_: any) {
        switch(typeof _) {
            case 'undefined': return null
            case 'function': return null
            case 'object': {
                if(_ instanceof Node) {
                    return _.uuid;
                } else if (_ instanceof Component) {
                    return _.uuid
                } else if(_ instanceof Asset) {
                    return _.uuid
                } else {
                    if(!_) return null
                    const _obj = js.createMap();
                    Object.keys(_).forEach(_key => {
                        const _val = _[_key];
                        _obj[_key] = this._extract(_val);
                    })
                    return _obj
                }
            }
            default: {
                return _;
            }
        }
    }

    protected _actUnTrustExtract() {
        const _obj: Helper_Param_Creator.IData = js.createMap();
        const _temp = Array.isArray(this.data) ? this.data.find(_ => _ !== null && _ !== undefined) : this.data
        if(Array.isArray(this.data)) {
            _obj.data = this.data.map(_ => this._extract(_) )
        } else {
            _obj.data = this._extract(this.data)
        }
        if(!_temp) {
            _obj.type = 'undefined'
            return _obj;
        }

        switch(typeof _temp) {
            case 'string': {
                _obj.type = 'CCString';
                break;
            }
            case 'number':
            case 'bigint': {
                _obj.type = 'CCFloat';
                break;
            }
            case 'boolean': {
                _obj.type = 'CCBoolean';

                break;
            }
            case 'symbol': {
                _obj.type = 'CCString';
                break;
            }
            case 'function':
            case 'undefined': {
                _obj.type = 'undefined'
                break;
            }
            case 'object': {
                _obj.type = js.getClassName(_temp);
                break;
            }
        }

        return _obj;
    }

    protected _actTrustExtract() {
        const _obj: Helper_Param_Creator.IData = js.createMap();
        if(Array.isArray(this.data)) {
            _obj.data = this.data.map(_ => this._extract(_) );
        } else {
            _obj.data = this._extract(this.data);
        }
        switch(this._filter) {
            case 'cc.Node': {
                _obj.type = 'cc.Node'
                break;
            }
            default: {
                _obj.type = this.type;
                break;
            }
        }

        return _obj;
    }

    extract(trusted: boolean = true) {
        return trusted ? this._actTrustExtract() : this._actUnTrustExtract();
    }

}

