import { _decorator } from 'cc';
import { Event_Driver } from './Event.Driver';
import { Parameter_Selector } from '../Parameter/Parameter.Selector';
import { pConst } from '../../utils';

const { ccclass, property, executionOrder } = _decorator;

interface _I {
    onPreLoad: pFlex.TFunc
    onLoad: pFlex.TFunc
    onEnable: pFlex.TFunc
    onDisable: pFlex.TFunc
    onDestroy: pFlex.TFunc

}

@ccclass('Event_LifeCycle')
@executionOrder(-1000)
export class Event_LifeCycle extends Event_Driver<_I> {
    protected static _$bounces = ['onPreLoad', 'onLoad', 'onEnable', 'onDisable', 'onDestroy'];

    @property({ type: Parameter_Selector, group: pConst.GROUPS.CORE })
    parameter: Parameter_Selector = new Parameter_Selector();

    protected _onPreLoad(): void {
        this.emit('onPreLoad', ...this.parameter.data);
    }

    protected onLoad(): void {
        this.emit('onLoad', ...this.parameter.data);
    }

    protected onEnable(): void {
        this.emit('onEnable', ...this.parameter.data);
    }

    protected onDisable(): void {
        this.emit('onDisable', ...this.parameter.data);
    }

    protected onDestroy(): void {
        this.emit('onDestroy', ...this.parameter.data);
    }
}
