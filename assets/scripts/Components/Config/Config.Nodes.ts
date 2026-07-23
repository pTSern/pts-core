
import { _decorator } from 'cc';
import { Config_Base } from './Config.Base';
import { Editor_PleaseOverride } from '../../editor/Smart/Editor.PleaseOverride';
import { Helper_Selector_SpriteFrame } from '../../helper/Selector/Helper.Selector.SpriteFrame';
import { Helper_Selector_Nodes } from '../../helper/Selector/Helper.Selector.Nodes';

const { ccclass, property } = _decorator;

@ccclass('Config_Nodes')
export class Config_Nodes extends Config_Base<Helper_Selector_Nodes> {
    @property({ type: Helper_Selector_Nodes, visible: true })
    target: Helper_Selector_Nodes = new Helper_Selector_Nodes();

    protected _getNewTarget() {
        return new Helper_Selector_Nodes();
    }

    protected _$methods: pFlex.TKeyOf<Editor_PleaseOverride, any, false>[] = [];

    protected onLoad(): void {
    }

    get(index: number | string) {
    }

}
