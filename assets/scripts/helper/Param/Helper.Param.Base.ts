import { _decorator, Component } from 'cc';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';

const { ccclass, property } = _decorator;

@ccclass('Helper_Param_Base')
export abstract class Helper_Param_Base extends Editor_Smart_SelfFocus {

    focus(): void {
    }
}
