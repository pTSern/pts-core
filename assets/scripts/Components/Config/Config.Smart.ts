import { _decorator, CCClass, Enum, js } from 'cc';
import { Object_IIdHolder } from '../../interfaces/object/Object.IIdHolder';
import { Helper_IdSelector } from '../../helper/Helper.IdSelector';
import { Helper_Selector_Smart } from '../../helper/Selector/Helper.Selector.Smart';
import { pClass, pConst } from '../../utils';
import { CC_EnumList } from '../../interfaces/cc/CC.IEnumable';
import { Shared_Pool } from '../Shared/Shared.Pool';

const { ccclass, property } = _decorator;

@ccclass('Config_Smart')
export class Config_Smart<_TObject> extends Shared_Pool<Helper_Selector_Smart<_TObject>> implements Object_IIdHolder<string> {
    protected static _prefix: string = "Config_Smart_";

    static get<T>(this: new (...args: any[]) => Config_Smart<T>, key: string | Helper_IdSelector<any>): Helper_Selector_Smart<T> | undefined;
    static get<T>(key: Helper_IdSelector<T>): Helper_Selector_Smart<T> | undefined;
    static get<T = any>(key: string | Helper_IdSelector<any>): Helper_Selector_Smart<T> | undefined;
    static get(this: any, key: any): any {
        return this.take(key);
    }

    static wait<T>(this: new (...args: any[]) => Config_Smart<T>, key: string | Helper_IdSelector<any>): Promise<Helper_Selector_Smart<T>>;
    static wait<T>(key: Helper_IdSelector<T>): Promise<Helper_Selector_Smart<T>>;
    static wait<T = any>(key: string | Helper_IdSelector<any>): Promise<Helper_Selector_Smart<T>>;
    static wait(this: any, key: any): Promise<any> {
        return this.await(key);
    }

    protected _$lock: boolean = false;
    protected _$seal: boolean = false;
    protected _$max: number = 0;
    protected _$creator: pFlex.TFunc<[number], _TObject> = null
    protected _$sid: string = null;

    @property({ group: pConst.GROUPS.CORE, override: true, readonly: true })
    isShared: boolean = true
    @property({})
    protected _filter: pClass.ETypes = 'cc.Node';

    @property({ type: pClass.ETypes, group: pConst.GROUPS.CORE })
    get filter(): pClass.ETypes { return this._filter }
    set filter(x: pClass.ETypes) {
        if (this._filter === x) return;
        this._filter = x;
        this.onFocusInEditor();
    }

    @property({})
    protected _type: string = '';
    @property({ type: Enum({}), visible() { return this._filter !== 'cc.Node' }, group: pConst.GROUPS.CORE })
    get type(): string { return this._type }
    set type(x: string) {
        if (this._type === x) return;

        this._type = x;
        this.onFocusInEditor();
    }

    protected _key: string = 'name'

    @property({ type: Helper_Selector_Smart, group: pConst.GROUPS.CORE })
    target = new Helper_Selector_Smart<_TObject>();

    list() { return this.target.list; }

    is(type: pFlex.TCtor<any, _TObject>) {
        const _name = js.getClassName(type);
        const _current = pClass.getClassName(this._filter, this._type);

        return (_name === _current)
    }

    protected _onPoolSetSuccess?: (args_0: Helper_Selector_Smart<_TObject>) => void = _ => {
        _.key(this._key);
        _.init();
    }

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
