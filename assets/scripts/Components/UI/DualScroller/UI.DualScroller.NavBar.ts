
import { _decorator, math, Node, tween, UIOpacity, v3, Vec3 } from 'cc';
import { pConst } from '../../../utils';
import { editor_property } from '../../../utils/pClass';
import { UI_DualScroller_NavIcons } from './UI.DualScroller.NavIcons';
import { Event_Driver } from '../../Event/Event.Driver';

const { ccclass, property } = _decorator;
const _symbol = Symbol('_function')

type _Type = {
    onIconClicked(page: number): void

}

@ccclass('UI_DualScroller_NavBar')
export class UI_DualScroller_NavBar extends Event_Driver<_Type> {
    @property({ type: UI_DualScroller_NavIcons, group: pConst.GROUPS.CORE })
    icon: UI_DualScroller_NavIcons = null

    @property({ group: pConst.GROUPS.CORE })
    numActiveScale: number = 1.4

    @property({ group: pConst.GROUPS.CORE })
    numInactiveScale: number = 0.85

    @property({ group: pConst.GROUPS.CORE })
    spacing: number = 80;

    @property({ group: pConst.GROUPS.CORE })
    numActiveOffsetY: number = 10;

    @editor_property()
    protected _numCurrentPage: number = 0
    @editor_property([Vec3])
    protected _iconBasePos: Vec3[] = []

    protected onLoad(): void {
        this._actCachingBasePos();
        this._actBindClickEvents();
    }

    protected onDestroy(): void {
        this._actUnBindClickEvents();
    }

    protected _actCachingBasePos() {
        const _total = this.icon.length;
        const _width = ( _total - 1 ) * this.spacing;
        const _sX = -_width / 2;

        this._iconBasePos = []

        for(let i = 0; i < _total; i++) {
            const _pos = v3(_sX + i * this.spacing, 0, 0);
            this._iconBasePos.push(_pos);
            this.icon.at(i)?.setPosition(_pos);
        }
    }

    protected _actBindClickEvents() {
        this.icon.actForEach( (_, i) => {
            if(!_) return;

            _[_symbol] = () => this.emit('onIconClicked', i);
            _.on(Node.EventType.TOUCH_END, _[_symbol], this);
        } )
    }

    protected _actUnBindClickEvents() {
        try {
            this.icon.actForEach( _ => {
                if(!_) return;

                _[_symbol] && _.off(Node.EventType.TOUCH_END, _[_symbol], this);
            })
        } catch(e) {}
    }

    public actUpdateIcons(current: number) {
        this._numCurrentPage = current;

        this.icon.actForEach( (_, i) => {
            if(!_) return;

            const _distance = Math.abs(current - i);
            const _temp = math.clamp01(1 - _distance);

            const _scale = this.numInactiveScale + ( this.numActiveScale - this.numInactiveScale ) * _temp;
            _.setScale(_scale, _scale, 1);

            const _pos = this._iconBasePos[i];
            if(_pos) {
                const _yo = this.numActiveOffsetY * _temp;
                _.setPosition(_pos.x, _pos.y + _yo, _pos.z);
            }

            const _opx = _.getComponent(UIOpacity);
            _opx && ( _opx.opacity = math.lerp(120, 255, _temp) );
        } )
    }

    actSnapTo(index: number, duration: number = 0.3) {
        const _obj = { value: this._numCurrentPage };

        tween(_obj)
            .to(
                duration,
                { value: index },
                { onUpdate: () => this.actUpdateIcons(_obj.value) }
            ).start();
    }

}
