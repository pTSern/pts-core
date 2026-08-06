import { _decorator, CCClass, js, JsonAsset } from 'cc';
import { CC_EnumList } from '../interfaces/cc/CC.IEnumable';
import { Editor_Smart_SelfFocus } from '../editor/Smart/Editor.Smart.SelfFocus';
import { pConst } from '../utils';

const { ccclass, property } = _decorator;

@ccclass('Helper_IdSelector')
export class Helper_IdSelector extends Editor_Smart_SelfFocus {
    @property({ visible() { return pConst.EDITOR_ONLY_IN_PREVIEW }, readonly: true, group: pConst.GROUPS.DEBUGGER })
    protected _sid: string = js.IDGenerator.global.getNewId();

    @property({ group: pConst.GROUPS.CORE  })
    get sid() { return this._sid }
    set sid(x) { this._sid = x }

    @property({ type: JsonAsset })
    protected _data: JsonAsset = null;

    @property({ type: JsonAsset, group: pConst.GROUPS.OPTION })
    get data() { return this._data }
    set data(x)  {
        this._data = x;

        this.focus()
    }

    @property({ readonly: true })
    protected _$lock: boolean = false;

    lock(id: string) {
        this._sid = id;
        this._$lock = true;
    }

    focus(): void {
        if(this._$lock) {
            this._data = null;
            CCClass.Attr.setClassAttr(this, 'data', 'readonly', true);
            CCClass.Attr.setClassAttr(this, 'data', 'visible', false);
            CCClass.Attr.setClassAttr(this, 'sid', 'readonly', true);
        }

        if(!this._data) {
            CCClass.Attr.setClassAttr(this, 'sid', 'type', '');
            return;
        }

        const _json = this._data.json;
        if(!_json) return;

        const _keys = Object.keys(_json);
        const _cce = CC_EnumList(_keys);

        CCClass.Attr.setClassAttr(this, 'sid', 'type', 'Enum');
        CCClass.Attr.setClassAttr(this, 'sid', 'enumList', _cce);
    }
}
