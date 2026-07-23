
import { _decorator, SpriteFrame } from 'cc';
import { Helper_Selector_Base } from './Helper.Selector.Base';

const { ccclass } = _decorator;

@ccclass('Helper_Selector_SpriteFrame')
export class Helper_Selector_SpriteFrame extends Helper_Selector_Base<SpriteFrame> {
    protected _$ctor = SpriteFrame;

    protected _key(obj: SpriteFrame): string {
        return obj.name
    }
}
