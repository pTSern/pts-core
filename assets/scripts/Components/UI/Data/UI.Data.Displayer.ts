import { _decorator, Component } from 'cc';
import { Smart_Label_Hooker } from '../../Smart/Label/Hooker/Smart.Label.Hooker';
import { Data_Manager } from '../../../data/manager';

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
        console.log(`[UI_Data_Displayer._Helper] Refreshing key: ${this.key}, value:`, _data);
        if(_data === undefined || _data === null) return;

        this.hooker.set(_data as _TType);
    }
}

@ccclass('UI_Data_Displayer')
export class UI_Data_Displayer extends Component {
    @property({ type: _Helper })
    list: _Helper<any>[] = [];

    protected onEnable(): void {
        this.list.forEach(_helper => _helper.refresh());
    }
}
