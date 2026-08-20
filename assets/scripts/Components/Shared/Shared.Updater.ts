import { _decorator } from 'cc';
import { Event_Driver } from '../Event/Event.Driver';
import { Event_Flexer } from '../Event/Event.Flexer';
import { pConst } from '../../utils';

const { ccclass, property } = _decorator;

@ccclass('Shared_Updater')
export class Shared_Updater extends Event_Driver<{ onUpdate: pFlex.TFunc<[number], void> }> {
    protected static _$bounces = ['onUpdate']

    @property({ type: Event_Flexer, group: pConst.GROUPS.CORE })
    onBeforeEvent: Event_Flexer = new Event_Flexer();

    @property({ type: Event_Flexer, group: pConst.GROUPS.CORE })
    onAfterEvent: Event_Flexer = new Event_Flexer();

    protected update(dt: number): void {
        this.onBeforeEvent.emit(dt);
        this.emit('onUpdate', dt);
        this.onAfterEvent.emit(dt);
    }
}
