import { _decorator, CCClass, Component, Enum, js } from 'cc';
import { Object_IIdHolder } from '../../interfaces/object/Object.IIdHolder';
import { Helper_IdSelector } from '../../helper/Helper.IdSelector';
import { Helper_Selector_Smart } from '../../helper/Selector/Helper.Selector.Smart';
import { pClass } from '../../utils';
import { CC_EnumList } from '../../interfaces/cc/CC.IEnumable';

const { ccclass, property } = _decorator;

@ccclass('Config_Smart')
export class Config_Smart<_TObject> extends Component implements Object_IIdHolder<string> {

    private static _$pool = new Map<string, any>()

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
    target = new Helper_Selector_Smart<_TObject>()

    get id(): string {
        return this.hid.sid;
    }

    is(type: pFlex.TCtor<any, _TObject>) {
        const _name = js.getClassName(type);
        const _current = pClass.getClassName(this._filter, this._type);

        return (_name === _current)
    }

    protected __preload(): void {
        const _ret = Config_Smart._$pool.get(this.id);
        if(!_ret) {
            Config_Smart._$pool.set(this.id, this.target);
        } else {
            this.target = _ret;
        }
    }

    onFocusInEditor(): void {
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
    }

    get(index: number | string) {
        return this.target.get(index);
    }
}
