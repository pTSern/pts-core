import { _decorator, CCClass, Enum, js } from 'cc';
import { Helper_Param_Base } from './Helper.Param.Base';
import { pClass, pConst } from '../../utils';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';
import { CC_EnumList } from '../../interfaces/cc/CC.IEnumable';

const { ccclass, property } = _decorator;

@ccclass('Helper_Param_Creator')
export class Helper_Param_Creator extends Editor_Smart_SelfFocus {
    @property({ type: [Helper_Param_Base], group: pConst.GROUPS.CORE, readonly: { deep: false } })
    params: Helper_Param_Base[] = []

    @property({  })
    protected _filter: pClass.EList = 'cc.Component';

    @property({ type: pClass.EList })
    get filter() { return this._filter }
    set filter(x) {
        this._filter = x;
        this.focus();
    }

    @property({ type: Enum({}) })
    type: string = ''


    focus(): void {
        const _list = pClass.getAllCCClasses(this._filter);
        const _cce = CC_EnumList(Array.from(_list));
        CCClass.Attr.setClassAttr(this, 'type', 'enumList', _cce);
    }
}
