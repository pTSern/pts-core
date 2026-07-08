
import { _decorator, Component, EventTouch, Node, tween, Tween, view } from 'cc';
import { UI_DualScroller_NavBar } from './UI.DualScroller.NavBar';
import { pConst } from '../../../utils';
import { UI_DualScroller_NavIndicator } from './UI.DualScroller.NavIndicator';
import { editor_property } from '../../../utils/pClass';
import { UI_DualScroller_Page } from './UI.DualScroller.Page';
import { Type_EasingSelector } from '../../Type/Type.Easing';

const { ccclass, property } = _decorator;

@ccclass('UI_DualScroller_Controller')
export class UI_DualScroller_Controller extends Component {
    @property({ type: Node })
    protected _container: Node = null
    @property({ type: Node, group: pConst.GROUPS.CORE })
    get container() { return this._container }
    set container(x) {
        if(x && x == this.node) return;
        this._container = x;
    }

    @property({ min: 0, group: pConst.GROUPS.CORE })
    numSnapDuration: number = 0.25

    @property({ type: UI_DualScroller_NavBar, group: pConst.GROUPS.OPTION })
    bar: UI_DualScroller_NavBar = null

    @property({ type: UI_DualScroller_NavIndicator, group: pConst.GROUPS.OPTION })
    indicator: UI_DualScroller_NavIndicator = null

    @property({ min: 0, group: pConst.GROUPS.CORE })
    numSwipeThreshold: number = 300;

    @property({ min: 0, group: pConst.GROUPS.CORE })
    numDragThreshold: number = 0.25

    @property({ min: 0, group: pConst.GROUPS.CORE })
    numElasticFactor: number = 0.35

    @property({ type: Type_EasingSelector, group: pConst.GROUPS.CORE })
    easing: Type_EasingSelector = new Type_EasingSelector();

    @editor_property([UI_DualScroller_Page])
    protected _pages: UI_DualScroller_Page[] = []

    @editor_property()
    protected _numCurrentPage: number = 0;

    @editor_property()
    protected _intCurrentOffset: number = 0;

    @editor_property()
    protected _numTouchStartX: number = 0

    @editor_property()
    protected _numTouchStartOffset: number = 0

    @editor_property()
    protected _numTouchStartTime: number = 0

    @editor_property()
    protected _isDragging: boolean = false;

    @editor_property()
    protected _numPageWidth: number = 0

    protected _tween: Tween = null

    protected onLoad(): void {
        this._numPageWidth = this._getPageWidth();
        this._actCollectingPages();
        this.bind(true);
        this._actSnapTo(0, 0);
    }

    protected onDestroy(): void {
        this.bind(false);
    }

    protected bind(isOn: boolean) {
        const _method = isOn ? 'on' : 'off';

        this.node[_method](Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node[_method](Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node[_method](Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node[_method](Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    protected _onTouchStart(event: EventTouch) {
        this._actStopSnapping();
        const _loc = event.getUILocation();

        this._numTouchStartX = _loc.x;
        this._numTouchStartOffset = this._intCurrentOffset;
        this._numTouchStartTime = Date.now();
        this._isDragging = true;
        console.log("[UI_DualScroller_Controller].{ _onTouchStart }")
    }

    protected _onTouchMove(event: EventTouch) {
        if(!this._isDragging) return;

        const _loc = event.getUILocation();
        const _dtX = _loc.x - this._numTouchStartX;

        const _offset = this._numTouchStartOffset - _dtX;

        this._actApplyOffset(_offset);
        console.log("[UI_DualScroller_Controller].{ _onTouchMove }")
    }

    protected _onTouchEnd(event: EventTouch) {
        if(!this._isDragging) return;
        this._isDragging = false;

        const _loc = event.getUILocation();
        const _elapsed = ( Date.now() - this._numTouchStartTime ) / 1000;
        const _totalDeltaX = _loc.x - this._numTouchStartX;
        const _velocity = _elapsed > 0 ? _totalDeltaX / _elapsed : 0;
        const _float = this._intCurrentOffset / this._numPageWidth;

        let _target: number;

        if(Math.abs(_velocity) > this.numSwipeThreshold) {
            _target = _velocity < 0 ? Math.ceil(_float) : Math.floor(_float);
        } else if (Math.abs(_totalDeltaX) > this._numPageWidth * this.numDragThreshold) {
            _target = _totalDeltaX < 0 ? Math.ceil(_float) : Math.floor(_float);
        } else {
            _target = Math.round(_float);
        }

        const _offset = _target * this._numPageWidth;

        this._actSnapTo(_offset, this.numSnapDuration);
        console.log("[UI_DualScroller_Controller].{ _onTouchEnd }")
    }

    protected _actSnapTo(offset: number, duration: number) {
        this._actStopSnapping();

        const _obj = { offset: this._intCurrentOffset }
        this._tween = tween(_obj)
            .to(duration, { offset }, { easing: this.easing.get as pFlex.TFunc<[number], number>, onUpdate: () => this._actApplyOffset(_obj.offset) })
            .call( () => {
                this._actApplyOffset(offset);
                this._tween = null;
            } )
            .start();
    }

    protected _actApplyOffset(offset: number) {
        this._intCurrentOffset = offset;
        const _length = this._pages.length;

        if(!_length || !this._numPageWidth) return;

        const _float = offset / this._numPageWidth;

        if(!this.container) return;
        this.container.setPosition(-offset, 0, 0);

        this._pages.forEach( (_, i) => {
            _.node.setPosition( i * this._numPageWidth, _.node.position.y, _.node.position.z )
            const _numNormOffset = ( i * this._numPageWidth - offset) / this._numPageWidth
            _.actScrollUpdate(_numNormOffset);
        } )

        this.bar?.actUpdateIcons(_float);
        this.indicator?.actUpdatePosition(_float);

        const _rpage = Math.round(_float);

        if(_rpage !== this._numCurrentPage) {
            const _prev = this._numCurrentPage;
            this._numCurrentPage = _rpage;

            this._pages[_prev]?.actExitPage();
            this._pages[_rpage]?.actEnterPage();
        }
    }

    protected _actStopSnapping() {
        this._tween?.stop();
        this._tween = null;
    }

    protected _actCollectingPages() {
        this._pages = []
        if(!this.container) return

        const _pages = this.container.getComponentsInChildren(UI_DualScroller_Page);
        for(let i = 0; i < _pages.length; i ++) {
            const _page = _pages[i];
            if(!_page) continue;

            _page.index = i;
            this._pages.push(_page);
        }
    }

    protected _actLayoutPages() {
        this._pages.forEach((_, i) => _.node.setPosition(i * this._numPageWidth, 0, 0))
    }

    protected _getPageWidth() {
        return view.getVisibleSize().width;
    }
}
