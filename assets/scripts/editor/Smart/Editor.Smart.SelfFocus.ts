import { _decorator } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Editor_Smart_SelfFocus')
export class Editor_Smart_SelfFocus {
    private _$isFocusing: boolean = false;

    @property({ visible: true })
    get __update() {
        if(this._$isFocusing) {
            return false
        }

        this._$isFocusing = true;
        try {
            this.focus?.()
        } finally {
            this._$isFocusing = false;
        }

        return true
    }

    focus?(): void
}
