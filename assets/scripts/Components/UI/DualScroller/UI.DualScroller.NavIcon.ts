import { _decorator, Component } from 'cc';
import { editor_property } from '../../../utils/pClass';

const { ccclass } = _decorator;

@ccclass('UI_DualScroller_NavIcon')
export class UI_DualScroller_NavIcon extends Component {
    @editor_property()
    protected _isToggle: boolean = false;

    get isToggle() { return this._isToggle }

    protected _onToggleOn?(): void
    protected _onToggleOff?(): void

    actToggleOn() {
        if (this._isToggle) return;

        this._isToggle = true;
        this._onToggleOn?.();
    }

    actToggleOff() {
        if (!this._isToggle) return;

        this._isToggle = false;
        this._onToggleOff?.();
    }

    toggle(status: boolean) {
        status ? this.actToggleOn() : this.actToggleOff()
    }

}
