
import { _decorator, Component, EventTouch, math, Node, tween, Tween, view, UITransform, CCInteger, CCClass } from 'cc';
import { UI_DualScroller_NavBar } from './UI.DualScroller.NavBar';
import { pConst } from '../../../utils';
import { UI_DualScroller_NavIndicator } from './UI.DualScroller.NavIndicator';
import { editor_property } from '../../../utils/pClass';
import { UI_DualScroller_Page } from './UI.DualScroller.Page';
import { Type_EasingSelector } from '../../Type/Type.Easing';

const { ccclass, property, disallowMultiple } = _decorator;

@ccclass('UI_DualScroller_Controller')
@disallowMultiple()
export class UI_DualScroller_Controller extends Component {
    @property({ type: Node })
    protected _container: Node = null
    @property({ type: Node, group: pConst.GROUPS.CORE })
    get container() { return this._container }
    set container(x) {
        if(x && x == this.node) return;
        this._container = x;
        this.onFocusInEditor();
    }

    onFocusInEditor(): void {
        CCClass.Attr.setClassAttr(this, 'intStartPage', 'max', this._container ? this._container.children.length - 1 : 1);
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

    @property({ group: pConst.GROUPS.OPTION, type: CCInteger, min: 0, max: 100, step: 1, slide: true })
    intStartPage: number = 0;

    @editor_property([UI_DualScroller_Page])
    protected _pages: UI_DualScroller_Page[] = []

    @editor_property()
    protected _intCurrentPage: number = 0;

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

    @editor_property()
    protected _intPageBeforeMove: number = 0;

    protected _intEnteringPage: number = -1;
    protected _intExitingPage: number = -1;

    protected _numTouchStartY: number = 0;
    protected _hasDeterminedDirection: boolean = false;

    protected onLoad(): void {
        this._actCollectingPages();
        this._numPageWidth = this._getPageWidth();
        this.bind(true);
    }

    protected start(): void {
        this._actScrollTo(this.intStartPage);
    }

    protected _actScrollTo(page: number, duration?: number) {
        console.log("_actScrollTo", page)
        if (this._pages.length === 0) return;
        duration = duration ?? this.numSnapDuration;

        this._numPageWidth = this._getPageWidth();

        const _last = this._intCurrentPage;
        const _target = math.clamp(page, 0, this._pages.length - 1);

        this._intPageBeforeMove = _last;

        if (_last !== _target) {
            this._pages[_last]?.actStartExiting();
            this._pages[_target]?.actStartEntering();
            this._intEnteringPage = _target;
            this._intExitingPage = _last;
        }

        this._actSnapTo(_target, duration);
    }

    protected onDestroy(): void {
        this.bind(false);
    }

    protected bind(isOn: boolean) {
        const _method = isOn ? 'on' : 'off';

        this.node[_method](Node.EventType.TOUCH_START, this._onTouchStart, this, true);
        this.node[_method](Node.EventType.TOUCH_MOVE, this._onTouchMove, this, true);
        this.node[_method](Node.EventType.TOUCH_END, this._onTouchEnd, this, true);
        this.node[_method](Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this, true);

        this.bar?.[_method]('onIconClicked', { func: this._actScrollTo, binder: this })
    }

    protected _onTouchStart(event: EventTouch) {
        this._actStopSnapping();
        const _loc = event.getUILocation();

        this._numPageWidth = this._getPageWidth();

        this._numTouchStartX = _loc.x;
        this._numTouchStartY = _loc.y;
        this._numTouchStartOffset = this._intCurrentOffset;
        this._numTouchStartTime = Date.now();
        this._isDragging = false;
        this._hasDeterminedDirection = false;
    }

    protected _onTouchMove(event: EventTouch) {
        const _loc = event.getUILocation();

        if (!this._hasDeterminedDirection) {
            const _dx = Math.abs(_loc.x - this._numTouchStartX);
            const _dy = Math.abs(_loc.y - this._numTouchStartY);
            if (_dx > 5 || _dy > 5) {
                this._hasDeterminedDirection = true;
                if (_dx > _dy) {
                    this._isDragging = true;
                    this._intPageBeforeMove = this._intCurrentPage;
                    event.propagationStopped = true;
                } else {
                    this._isDragging = false;
                }
            }
            return;
        }

        if (!this._isDragging) return;

        const _dtX = _loc.x - this._numTouchStartX;
        const _offset = this._numTouchStartOffset - _dtX;

        this._actApplyOffset(_offset);
        event.propagationStopped = true;
    }

    protected _onTouchEnd(event: EventTouch) {
        if (!this._isDragging) {
            this._isDragging = false;
            this._hasDeterminedDirection = false;
            return;
        }
        this._isDragging = false;
        this._hasDeterminedDirection = false;

        event.propagationStopped = true;

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

        this._actSnapTo(_target, this.numSnapDuration);
    }

    protected _actSnapTo(page: number, duration: number) {
        this._actStopSnapping();

        const _length = this._pages.length;
        if (!_length) return;

        const _last = this._intPageBeforeMove;
        const _target = math.clamp(page, 0, _length - 1);
        const _offset = _target * this._numPageWidth;

        const _obj = { _offset: this._intCurrentOffset };
        this.bar?.actUpdateIcons(_target);
        this.indicator?.actUpdatePosition(_target);

        console.log("TWEEN >> SNAP FROM: ", _last, " >> TO >>", _target)
        this._tween = tween(_obj)
            .to(duration,
                { _offset },
                {
                    easing: this.easing.get as pFlex.TFunc<[number], number>,
                    onUpdate: () => this._actApplyOffset(_obj._offset)
                }
            )
            .call( () => {
                this._actApplyOffset(_offset);
                this._tween = null;
                if (_last !== _target) {
                    this._pages[_last]?.actExitCompletely();
                    this._pages[_target]?.actEnterCompletely();
                } else {
                    this._pages[_target]?.actEnterCompletely();
                }
                if (this._intEnteringPage !== -1 && this._intEnteringPage !== _target) {
                    this._pages[this._intEnteringPage]?.actCancelEnter();
                }
                this._intEnteringPage = -1;
                this._intExitingPage = -1;
            } )
            .start();
    }

    protected _actApplyOffset(offset: number) {
        if(this._intCurrentOffset === offset) return
        this._intCurrentOffset = offset;
        console.log("_actApplyOffset", offset)
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

        //this.bar?.actUpdateIcons(_float);
        //this.indicator?.actUpdatePosition(_float);

        this._intCurrentPage = Math.round(_float);

        if (this._isDragging) {
            let _entering = -1;
            let _exiting = -1;

            if (_float > this._intPageBeforeMove) {
                _entering = math.clamp(Math.ceil(_float), 0, _length - 1);
                _exiting = math.clamp(Math.floor(_float), 0, _length - 1);
            } else if (_float < this._intPageBeforeMove) {
                _entering = math.clamp(Math.floor(_float), 0, _length - 1);
                _exiting = math.clamp(Math.ceil(_float), 0, _length - 1);
            }

            if (_entering === _exiting) {
                _entering = -1;
                _exiting = -1;
            }

            if (_entering !== this._intEnteringPage) {
                if (this._intEnteringPage !== -1 && this._intEnteringPage !== _entering) {
                    this._pages[this._intEnteringPage]?.actCancelEnter();
                }
                this._intEnteringPage = _entering;
                if (this._intEnteringPage !== -1) {
                    this._pages[this._intEnteringPage]?.actStartEntering();
                }
            }

            if (_exiting !== this._intExitingPage) {
                this._intExitingPage = _exiting;
                if (this._intExitingPage !== -1) {
                    this._pages[this._intExitingPage]?.actStartExiting();
                }
            }
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

            _page.init(i);
            this._pages.push(_page);
        }
    }

    protected _actLayoutPages() {
        this._pages.forEach((_, i) => _.node.setPosition(i * this._numPageWidth, 0, 0))
    }

    protected _getPageWidth() {
        if (this._pages && this._pages.length > 0 && this._pages[0]?.node) {
            const transform = this._pages[0].node.getComponent(UITransform);
            if (transform && transform.contentSize.width > 0) {
                return transform.contentSize.width;
            }
        }
        const transform = this.node.getComponent(UITransform);
        if (transform && transform.contentSize.width > 0) {
            return transform.contentSize.width;
        }
        return view.getVisibleSize().width;
    }
}
