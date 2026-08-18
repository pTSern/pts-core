import { _decorator, CCClass, CCInteger, Component, Enum, js } from 'cc';
import { Object_IIdHolder } from '../../interfaces/object/Object.IIdHolder';
import { Helper_IdSelector } from '../../helper/Helper.IdSelector';
import { Helper_Selector_Smart } from '../../helper/Selector/Helper.Selector.Smart';
import { pClass } from '../../utils';
import { CC_EnumList } from '../../interfaces/cc/CC.IEnumable';
import { Dictionary_Persistent } from '../../helper/Dictionary/Dictionary.Persistent';

const { ccclass, property } = _decorator;

enum _EMode {
    Set = 1,
    Get = 2,
}

Enum(_EMode);

@ccclass('Config_Smart')
export class Config_Smart<_TObject> extends Component implements Object_IIdHolder<string> {

    private static _$pool = new Dictionary_Persistent<string, Helper_Selector_Smart<any>>();
    private static _$waiters = js.createMap(true);
    static get<_TObject>(key: string) {
        return Config_Smart._$pool.get(key) as Helper_Selector_Smart<_TObject>;
    }

    static wait<_TObject>(key: string | Helper_IdSelector): Promise<Helper_Selector_Smart<_TObject>> {
        if(key instanceof Helper_IdSelector) {
            key = key.sid;
        }

        let _out = Config_Smart._$waiters[key];
        if(!_out) {
            _out = Config_Smart._$waiters[key] = new Promise<Helper_Selector_Smart<_TObject>>(_rs => {
                const _ret = Config_Smart._$pool.get(key, _ => _rs(_));
                _ret && _rs(_ret as Helper_Selector_Smart<_TObject>);
            })
        }

        return _out;
    }

    protected _$lock: boolean = false;
    protected _$seal: boolean = false;
    protected _$max: number = 0;
    protected _$creator: pFlex.TFunc<[number], _TObject> = null
    protected _$sid: string = null;

    @property({ type: _EMode })
    mode: _EMode = _EMode.Set;
    @property({ type: CCInteger, min: 0, visible() { return this.mode === _EMode.Set } })
    state: number = 5;

    @property({ type: Helper_IdSelector })
    hid: Helper_IdSelector = new Helper_IdSelector();

    @property({})
    protected _filter: pClass.ETypes = 'cc.Node';

    @property({ type: pClass.ETypes })
    get filter(): pClass.ETypes { return this._filter }
    set filter(x: pClass.ETypes) {
        if (this._filter === x) return;
        this._filter = x;
        this.onFocusInEditor();
    }

    @property({})
    protected _type: string = '';
    @property({ type: Enum({}), visible() { return this._filter !== 'cc.Node' }})
    get type(): string { return this._type }
    set type(x: string) {
        if (this._type === x) return;

        this._type = x;
        this.onFocusInEditor();
    }

    @property({})
    protected _key: string = 'name'

    @property({ type: Helper_Selector_Smart })
    target = new Helper_Selector_Smart<_TObject>();

    list() { return this.target.list; }

    get id(): string {
        return this.hid.sid;
    }

    is(type: pFlex.TCtor<any, _TObject>) {
        const _name = js.getClassName(type);
        const _current = pClass.getClassName(this._filter, this._type);

        return (_name === _current)
    }

    protected __preload(): void {
        switch(this.mode) {
            case _EMode.Set: {
                Config_Smart._$pool.set(this.id, this.target, { state: this.state, onFail: _ => this.target = _ });
                break;
            }
            case _EMode.Get: {
                this.target = Config_Smart._$pool.get(this.id, _ => this.target = _);
                break;
            }
        }

        this._onPreLoad?.();
    }

    protected _onPreLoad?(): void

    resetInEditor(): void {
        this.target.set(this._filter === 'cc.Node' ? this._filter : this.type);
        this.onFocusInEditor();
    }

    onFocusInEditor(): void {
        CCClass.Attr.setClassAttr(this, 'type', 'readonly', this._$lock);
        CCClass.Attr.setClassAttr(this, 'filter', 'readonly', this._$lock);

        CCClass.Attr.setClassAttr(this, 'filter', 'visible', !this._$lock);
        CCClass.Attr.setClassAttr(this, 'type', 'visible', !this._$lock);

        if(!!this._$sid) {
            this.hid.lock(this._$sid);
        }

        this.target.max(this._$max, this._$creator);
        this._$seal && this.target.seal();

        switch(this._filter) {
            case 'cc.Node': break;
            case 'Primitive': {
                CCClass.Attr.setClassAttr(this, 'type', 'enumList', pClass.CCEPrimitive);
                break;
            }
            default: {
                const _classes = pClass.getAllCCClasses(this._filter);
                const _EList = CC_EnumList(Array.from(_classes));
                CCClass.Attr.setClassAttr(this, 'type', 'enumList', _EList);

                break;
            }
        }


        this.target.ctor(pClass.getClassName(this._filter, this._type));
        this.target.key(this._key);
        this._onFocusInEditor?.();
    }

    protected _onFocusInEditor?(): void

    get(index: number | string = 0): _TObject {
        return this.target.get(index);
    }
}
