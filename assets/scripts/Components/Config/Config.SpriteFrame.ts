import { _decorator } from 'cc';
import { Config_Base } from './Config.Base';
import { Editor_PleaseOverride } from '../../editor/Smart/Editor.PleaseOverride';
import { Helper_Selector_SpriteFrame } from '../../helper/Selector/Helper.Selector.SpriteFrame';

const { ccclass, property } = _decorator;

@ccclass('Config_SpriteFrame')
export class Config_SpriteFrame extends Config_Base<Helper_Selector_SpriteFrame> {
    @property({ type: Helper_Selector_SpriteFrame, visible: true })
    target: Helper_Selector_SpriteFrame = new Helper_Selector_SpriteFrame();

    protected _getNewTarget(): Helper_Selector_SpriteFrame {
        return new Helper_Selector_SpriteFrame();
    }

    protected _$methods: pFlex.TKeyOf<Editor_PleaseOverride, any, false>[] = [];

    protected onLoad(): void {
        this.target.init();
    }

    get(index: number | string) {
        return this.target.get(index);
    }

}
