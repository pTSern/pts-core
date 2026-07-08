
import { _decorator, Component, math, Vec3 } from 'cc';
import { UI_DualScroller_NavIcons } from './UI.DualScroller.NavIcons';
import { pConst } from '../../../utils';
import { editor_property } from '../../../utils/pClass';

const { ccclass, property } = _decorator;

@ccclass('UI_DualScroller_NavIndicator')
export class UI_DualScroller_NavIndicator extends Component {
    @property({ type: UI_DualScroller_NavIcons, group: pConst.GROUPS.CORE })
    icon: UI_DualScroller_NavIcons = null

    @property({ group: pConst.GROUPS.CORE })
    speed: number = 12;

    @editor_property()
    protected _x: number = 0

    protected start(): void {
        const _icon = this.icon.at(0);
        if(this.icon.length > 0 && _icon) {
            this._x = _icon.position.x;
            this.node.setPosition(this._x, this.node.position.y, 0);
        }
    }

    protected update(dt: number): void {
        const _pos = this.node.position;
        const _x = math.lerp(_pos.x, this._x, math.clamp01(this.speed * dt));
        this.node.setPosition(_x, _pos.y, _pos.z);
    }

    actUpdatePosition(current: number) {
        if(!this.icon.length) return;

        const _total = this.icon.length;
        const _fidx = math.clamp(Math.floor(current), 0 , _total - 1);
        const _cidx = math.clamp(Math.ceil(current), 0, _total - 1);
        const _temp = current - Math.floor(_cidx);

        const _posA = this.icon.at(_fidx)?.position ?? Vec3.ZERO;
        const _posB = this.icon.at(_cidx)?.position ?? Vec3.ZERO;

        this._x = math.lerp(_posA.x, _posB.x, _temp);
    }
}
