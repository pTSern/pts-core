import { _decorator, Node, Component, director, DirectorEvent, NodeEventType, TransformBit, UITransform, Enum } from 'cc';
import { pEngine } from '../../../utils';
import { editor_property } from '../../../utils/pClass';

const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

export enum HorizontalAlign {
    LEFT = 0,
    CENTER = 1,
    RIGHT = 2,
    NONE = 3,
}
Enum(HorizontalAlign);

export enum VerticalAlign {
    NONE = 0,
    TOP = 1,
    CENTER = 2,
    BOTTOM = 3,
}
Enum(VerticalAlign);

@ccclass('Smart_Layout_Base')
@requireComponent(UITransform)
@executeInEditMode
export abstract class Smart_Layout_Base extends Component {
    @property({ tooltip: 'Left padding in pixels' })
    protected _paddingLeft: number = 0;
    @property({ tooltip: 'Left padding in pixels' })
    get paddingLeft(): number { return this._paddingLeft; }
    set paddingLeft(val: number) {
        if (this._paddingLeft !== val) {
            this._paddingLeft = val;
            this._actDirtyLayout();
        }
    }

    @property({ tooltip: 'Right padding in pixels' })
    protected _paddingRight: number = 0;
    @property({ tooltip: 'Right padding in pixels' })
    get paddingRight(): number { return this._paddingRight; }
    set paddingRight(val: number) {
        if (this._paddingRight !== val) {
            this._paddingRight = val;
            this._actDirtyLayout();
        }
    }

    @property({ tooltip: 'Top padding in pixels' })
    protected _paddingTop: number = 0;
    @property({ tooltip: 'Top padding in pixels' })
    get paddingTop(): number { return this._paddingTop; }
    set paddingTop(val: number) {
        if (this._paddingTop !== val) {
            this._paddingTop = val;
            this._actDirtyLayout();
        }
    }

    @property({ tooltip: 'Bottom padding in pixels' })
    protected _paddingBottom: number = 0;
    @property({ tooltip: 'Bottom padding in pixels' })
    get paddingBottom(): number { return this._paddingBottom; }
    set paddingBottom(val: number) {
        if (this._paddingBottom !== val) {
            this._paddingBottom = val;
            this._actDirtyLayout();
        }
    }

    @property({ tooltip: 'If true, automatically distributes spacing between children to fit container bounds' })
    protected _autoSpacing: boolean = true;
    @property({ tooltip: 'If true, automatically distributes spacing between children to fit container bounds' })
    get autoSpacing(): boolean { return this._autoSpacing; }
    set autoSpacing(val: boolean) {
        if (this._autoSpacing !== val) {
            this._autoSpacing = val;
            this._actDirtyLayout();
        }
    }

    @property({ tooltip: 'Fixed spacing between children (used when autoSpacing is false)', visible() { return !this.autoSpacing; } })
    protected _spacing: number = 0;
    @property({ tooltip: 'Fixed spacing between children (used when autoSpacing is false)', visible() { return !this.autoSpacing; } })
    get spacing(): number { return this._spacing; }
    set spacing(val: number) {
        if (this._spacing !== val) {
            this._spacing = val;
            this._actDirtyLayout();
        }
    }

    @editor_property(UITransform)
    protected _transform: UITransform = null;
    get transform(): UITransform {
        if (!this._transform) {
            this._transform = pEngine.CompUtils.get(this, UITransform);
        }
        return this._transform;
    }

    @editor_property(UITransform)
    protected _layouts: UITransform[] = [];
    @editor_property()
    protected _isLayoutDirty: boolean = true;
    @editor_property()
    protected _isChildrenDirty: boolean = false;
    @editor_property()
    protected _init: boolean = false;

    protected onEnable(): void {
        this._bind('on');
        this._onChildrenChanged();
        this.actUpdateLayout(true);
    }

    protected onDisable(): void {
        this._layouts.length = 0;
        this._bind('off');
    }

    protected _getLayouts() {
        this._layouts.length = 0;
        const children = this.node.children;
        for (let i = 0; i < children.length; ++i) {
            const child = children[i];
            if (child && child.isValid && child.activeInHierarchy) {
                const uiTrans = child.getComponent(UITransform);
                if (uiTrans && uiTrans.isValid) {
                    this._layouts.push(uiTrans);
                }
            }
        }
    }

    protected _bind(mode: 'on' | 'off') {
        director[mode](DirectorEvent.AFTER_UPDATE, this.actUpdateLayout, this);
        this.node[mode](NodeEventType.SIZE_CHANGED, this._onResized, this);
        this.node[mode](NodeEventType.ANCHOR_CHANGED, this._actDirtyLayout, this);
        this.node[mode](NodeEventType.CHILD_ADDED, this._onChildAdded, this);
        this.node[mode](NodeEventType.CHILD_REMOVED, this._onChildRemoved, this);
        this.node[mode](NodeEventType.CHILDREN_ORDER_CHANGED, this._onChildrenChanged, this);
        this.node[mode]('childrenSiblingOrderChanged', this.actUpdateLayout, this);

        const children = this.node.children;
        for (let i = 0; i < children.length; ++i) {
            const child = children[i];
            child[mode](NodeEventType.SIZE_CHANGED, this._actDirtyLayout, this);
            child[mode](NodeEventType.TRANSFORM_CHANGED, this._actTransformDirty, this);
            child[mode](NodeEventType.ANCHOR_CHANGED, this._actDirtyLayout, this);
            child[mode](NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, this._onChildrenChanged, this);
        }
    }

    updateLayout(force: boolean = false): void {
        this.actUpdateLayout(force);
    }

    actUpdateLayout(force: boolean = false): void {
        if (this._isLayoutDirty || force) {
            this._update();
            this._isLayoutDirty = false;
        }
    }

    protected abstract _update(): void;

    protected _actTransformDirty(type: TransformBit) {
        if (type & TransformBit.SCALE) {
            this._actDirtyLayout();
        }
    }

    protected _onChildRemoved(child: Node) {
        if (child && child.isValid) {
            child.off(NodeEventType.SIZE_CHANGED, this._actDirtyLayout, this);
            child.off(NodeEventType.TRANSFORM_CHANGED, this._actTransformDirty, this);
            child.off(NodeEventType.ANCHOR_CHANGED, this._actDirtyLayout, this);
            child.off(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, this._onChildrenChanged, this);
        }
        this._onChildrenChanged();
    }

    protected _onChildAdded(child: Node) {
        if (child && child.isValid) {
            child.off(NodeEventType.SIZE_CHANGED, this._actDirtyLayout, this);
            child.off(NodeEventType.TRANSFORM_CHANGED, this._actTransformDirty, this);
            child.off(NodeEventType.ANCHOR_CHANGED, this._actDirtyLayout, this);
            child.off(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, this._onChildrenChanged, this);

            child.on(NodeEventType.SIZE_CHANGED, this._actDirtyLayout, this);
            child.on(NodeEventType.TRANSFORM_CHANGED, this._actTransformDirty, this);
            child.on(NodeEventType.ANCHOR_CHANGED, this._actDirtyLayout, this);
            child.on(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, this._onChildrenChanged, this);
        }
        this._onChildrenChanged();
    }

    protected _onChildrenChanged() {
        this._isChildrenDirty = true;
        this._actDirtyLayout();
    }

    protected _onResized() {
        this._actDirtyLayout();
    }

    protected _actDirtyLayout() {
        this._isLayoutDirty = true;
    }
}
