import { _decorator, CCClass, CCInteger, CCObject, js } from 'cc';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';
import { pConst } from '../../utils';

const { ccclass, property } = _decorator;

@ccclass('Helper_Selector_Base')
export abstract class Helper_Selector_Base<_TObject> extends Editor_Smart_SelfFocus {
    @property({ type: CCObject })
    protected _list: _TObject[] = []
    @property({ type: CCObject })
    get list() { return this._list }
    set list(x) {
        this._list = x;
        this.focus();
    }

    @property({ type: CCInteger, min: 0, max: 1, step: 1, slide: true, group: pConst.GROUPS.CORE })
    intDefaultIndex: number = 0;

    protected _map: Record<string, _TObject> = js.createMap(true);
    protected abstract _$ctor: pFlex.TCtor<any, _TObject>

    focus(): void {
        if(!this._$ctor) return;

        const _max = Math.max(0, this._list.length - 1);
        CCClass.Attr.setClassAttr(this, 'intDefaultIndex', 'max', _max);
        CCClass.Attr.setClassAttr(this, 'list', 'ctor', this._$ctor);
        CCClass.Attr.setClassAttr(this, '_list', 'ctor', this._$ctor);
        this._onFocus?.();
    }

    protected _onFocus?(): void

    init() {
        for(const _ret of this._list) {
            const _key = this._key(_ret);
            this._map[_key] = _ret;
        }
    }

    protected abstract _key(obj: _TObject): string

    get(index: number | string) {
        if(typeof index == 'number') return this._list[index];
        if(typeof index == 'string') return this._map[index];
        return null;
    }
}
