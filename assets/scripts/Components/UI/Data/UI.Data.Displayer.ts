import { _decorator, CCClass, Component } from 'cc';
import { Smart_Label_Hooker } from '../../Smart/Label/Hooker/Smart.Label.Hooker';
import { Data_Manager } from '../../../data/manager';
import { CC_IEnumList } from '../../../interfaces/cc/CC.IEnumable';

const { ccclass, property } = _decorator;

@ccclass('UI_Data_Displayer._Helper')
class _Helper<_TType> {
    @property({  })
    key = '' as Data_Manager.TKey;

    @property({ type: Smart_Label_Hooker })
    hooker: Smart_Label_Hooker<_TType> = null;

    async refresh() {
        if(!this.hooker) return;

        await Data_Manager.wait();
        const _data = Data_Manager.get(this.key);
        if(_data === undefined || _data === null) return;

        this.hooker.set(_data as _TType);
    }

    focus(list: CC_IEnumList<any, any>[]) {
        CCClass.Attr.setClassAttr(this, 'key', 'type', 'Enum');
        CCClass.Attr.setClassAttr(this, 'key', 'enumList', list);
    }
}

@ccclass('UI_Data_Displayer')
export class UI_Data_Displayer<_TList extends pFlex.TKey> extends Component {
    protected static _$helper: pFlex.TCtor<_Helper<any>> = _Helper;

    @property({ type: _Helper, visible: false })
    protected list: _Helper<_TList>[] = [];
    @property({ type: _Helper, visible: true })
    protected get _list() { return this.list; }
    protected set _list(x) {
        this.list = x;
        this.onFocusInEditor();
    }

    protected static _$list: pFlex.TKey[] = null

    protected onEnable(): void {
        this.list.forEach(_helper => _helper.refresh());
    }

    onFocusInEditor(): void {
        const _$list = this.constructor['_$list'] as pFlex.TKey[];
        if(!_$list) return;

        const _list = CC_IEnumList.generator(_$list);
        this.list.forEach(_helper => _helper.focus(_list));
    }

    resetInEditor(): void {
        this.onFocusInEditor();
    }
}

export namespace UI_Data_Displayer {
    export const Helper = _Helper;
    export type Helper<_TType> = _Helper<_TType>;
}
