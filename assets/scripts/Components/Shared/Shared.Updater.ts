import { _decorator, EventHandler } from 'cc';
import { Event_Driver } from '../Event/Event.Driver';

const { ccclass, property } = _decorator;

@ccclass('Shared_Updater')
export class Shared_Updater extends Event_Driver<{ onUpdate: pFlex.TFunc<[number], void> }> {
    @property({ type: EventHandler })
    onBeforeDriver: EventHandler[] = [];

    @property({ type: EventHandler })
    onAfterDriver: EventHandler[] = [];

    protected update(dt: number): void {
        EventHandler.emitEvents(this.onBeforeDriver, dt);
        this.emit('onUpdate', dt);
        EventHandler.emitEvents(this.onAfterDriver, dt);
    }
}
