
import { _decorator, CCClass, CCInteger, CCObject, js } from 'cc';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';
import { pConst } from '../../utils';

const { ccclass, property } = _decorator;

@ccclass('Helper_Selector_Smart')
export class Helper_Selector_Smart<_TObject> extends Editor_Smart_SelfFocus {
    @property({ readonly: true, visible: true })
    protected _filter: string = "cc.Component"

    @property({ readonly: true, visible() { return this._max > 0 } })
    protected _max: number = 0;

    @property({ type: CCObject })
    protected _list: _TObject[] = []
    @property({ type: CCObject })
    get list() { return this._list }
    set list(x) {
        this._list = x;
        if(this._max > 0 && this._list.length > this._max) {
            this._list.length = this._max
        }
        this.focus();
    }

    @property({ type: CCInteger, min: 0, max: 1, step: 1, slide: true, group: pConst.GROUPS.CORE })
    intDefaultIndex: number = 0;

    set(type: string) {
        this._filter = type;
    }

    max(max: number) {
        this._max = max;
    }

    static lazy<_TObject>(type: string) {
        const _ret = new Helper_Selector_Smart<_TObject>();
        _ret._filter = js.getClassName(type);
        return _ret;
    }

    static create<_TObject>(filter: pFlex.TCtor<any, _TObject>, key: pFlex.TFunc<[_TObject], string>) {
        const _ret = new Helper_Selector_Smart();
        _ret._filter = js.getClassName(filter);
        _ret._key = key;

        return _ret;
    }

    protected _map: Record<string, _TObject> = js.createMap(true);

    focus(): void {
        const _ctor = js.getClassByName(this._filter);
        if(!_ctor) return;

        for(let i = 0; i < this._list.length; i ++) {
            const _ret = this._list[i];
            if(_ret !== null && _ret instanceof _ctor) continue;
            this._list[i] = new _ctor() as _TObject;
        }

        const _max = Math.max(0, this._list.length - 1);
        CCClass.Attr.setClassAttr(this, 'intDefaultIndex', 'max', _max);

        CCClass.Attr.setClassAttr(this, 'list', 'ctor', _ctor);
        CCClass.Attr.setClassAttr(this, '_list', 'ctor', _ctor);

        this._onFocus?.();
    }

    protected _onFocus?(): void

    init() {
        for(const _ret of this._list) {
            const _key = this._key(_ret);
            this._map[_key] = _ret;
        }
    }

    protected _key: pFlex.TFunc<[_TObject], string> = _ => typeof _['name'] == 'string' ? _['name'] : String(_)

    get(index: number | string): _TObject | null {
        if(typeof index == 'number') return this._list[index];
        if(typeof index == 'string') return this._map[index];
        return null;
    }

    ctor(_class: string) {
        const _ctor = js.getClassByName(_class);
        if(!_ctor) return;

        this._filter = _class;
    }

    key(func: pFlex.TFunc<[_TObject], string> | string) {
        if(typeof func == 'function') { this._key = func; return }
        if(typeof func == 'string') { this._key = _ => _[func]; return }
    }
}

