import { _decorator, Button, UITransform, Node, ToggleContainer, EventHandler, Toggle, Sprite } from "cc";
import { editor_property, implement } from "../../utils/pClass";
import { EDITOR_NOT_IN_PREVIEW } from "cc/env";
const { ccclass, property, help, requireComponent, executionOrder } = _decorator

@implement(Toggle)
@ccclass('Smart_Toggle')
@help('i18n:cc.Toggle')
@executionOrder(110)
@requireComponent(UITransform)
//@ts-ignore
export class Smart_Toggle extends Button implements Toggle {

    @property({ tooltip: 'i18n:toggle.isChecked', displayOrder: 1 })
    get isChecked (): boolean { return this._isChecked }
    set isChecked (value) { this._set(value) }

    @property({ tooltip: 'i18n:toggle.unCheckMark', displayOrder: 1, type: Node })
    off: Node[] = []

    @property({ tooltip: 'i18n:toggle.checkMark', displayOrder: 1, type: Node })
    on: Node[] = []

    @property({ type: EventHandler, displayOrder: 99, tooltip: 'i18n:toggle.clickEvents' })
    checkEvents: EventHandler[] = [];

    set _resizeToTarget (value: boolean) {
        value && this._resizeNodeToTargetNode();
    }

    @editor_property(ToggleContainer)
    get _toggleContainer (): ToggleContainer | null {
        const parent = this.node.parent!;
        if (Node.isNode(parent)) {
            return parent.getComponent(ToggleContainer);
        }
        return null;
    }

    @editor_property()
    protected _isChecked = true;

    get checkMark(): Sprite { return this._checkMark }
    set checkMark(value: Sprite) { this._checkMark = value }
    protected _checkMark: Sprite;

    protected _internalToggle (): void {
        this.isChecked = !this.isChecked;
    }

    protected _notify(toggle: ToggleContainer, emitEvent = true): void {
        if (!toggle.enabledInHierarchy) { return; }

        for (let i = 0; i < toggle.toggleItems.length; i++) {
            const item = toggle.toggleItems[i]!;
            if (item.uuid === this.uuid) {
                continue;
            }
            if (emitEvent) {
                item.isChecked = false;
            } else {
                item.setIsCheckedWithoutNotify(false);
            }
        }

        if (toggle.checkEvents) {
            EventHandler.emitEvents(toggle.checkEvents, toggle);
        }
    }

    protected _set (value: boolean, emitEvent = true): void {
        if (this._isChecked == value) return;

        this._isChecked = value;

        const group = this._toggleContainer;
        if (group && group.enabled && this.enabled) {
            if (value || (!group.anyTogglesChecked() && !group.allowSwitchOff)) {
                this._isChecked = true;
                this._notify(group, emitEvent);
            }
        }

        this.playEffect();
        if (emitEvent) {
            this._emitToggleEvents();
        }
    }

    public playEffect (): void {
        this.on.forEach(_node => _node.active = this._isChecked);
        this.off.forEach(_node => _node.active = !this._isChecked);
    }

    public setIsCheckedWithoutNotify (value: boolean): void {
        this._set(value, false);
    }

    public onEnable (): void {
        super.onEnable();
        this.playEffect();
        if (!EDITOR_NOT_IN_PREVIEW) {
            this.node.on(Toggle.EventType.CLICK, this._internalToggle, this);
        }
    }

    public onDisable (): void {
        super.onDisable();
        if (!EDITOR_NOT_IN_PREVIEW) {
            this.node.off(Toggle.EventType.CLICK, this._internalToggle, this);
        }
    }

    protected _emitToggleEvents (): void {
        this.node.emit(Toggle.EventType.TOGGLE, this);
        if (this.clickEvents) {
            EventHandler.emitEvents(this.checkEvents, this);
        }
    }
}
