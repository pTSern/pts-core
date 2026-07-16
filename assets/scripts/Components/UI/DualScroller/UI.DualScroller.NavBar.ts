
import { _decorator, Node, tween, EventTouch } from 'cc';
import { pConst } from '../../../utils';
import { editor_property } from '../../../utils/pClass';
import { UI_DualScroller_NavIcons } from './UI.DualScroller.NavIcons';
import { Event_Driver } from '../../Event/Event.Driver';
import { UI_DualScroller_NavIcon } from './UI.DualScroller.NavIcon';

const { ccclass, property } = _decorator;

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

    protected onEnable(): void {
        this._actBindClickEvents();
    }

    protected onDisable(): void {
        this._actUnBindClickEvents();
    }

    protected _actBindClickEvents() {
        this.icon.actForEach( _ => {
            if(!_) return;

            _.node.off(Node.EventType.TOUCH_END, this._onIconTouchEnd, this);
            _.node.on(Node.EventType.TOUCH_END, this._onIconTouchEnd, this);
        } )
    }

    protected _actUnBindClickEvents() {
        try {
            this.icon.actForEach( _ => {
                if(!_) return;

                _.node.off(Node.EventType.TOUCH_END, this._onIconTouchEnd, this);
            })
        } catch(e) {}
    }

    private _onIconTouchEnd(event: EventTouch) {
        const _node = event.target as Node;
        if(typeof _node.getComponent !== 'function') return;

        const _icon = _node.getComponent(UI_DualScroller_NavIcon);
        _icon && this.emit('onIconClicked', _icon.index);
    }

    public actUpdateIcons(current: number) {
        this._numCurrentPage = current;

        this.icon.actForEach( (_, i) => 
            _.toggle?.( i === current )
         )
    }

}
