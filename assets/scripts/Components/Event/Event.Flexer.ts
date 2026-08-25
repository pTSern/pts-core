import { _decorator, CCInteger, EventHandler, JsonAsset } from 'cc';
import { pEngine } from '../../utils';
import { editor_property } from '../../utils/pClass';

const { ccclass, property } = _decorator;

@ccclass('Event_Flexer')
export class Event_Flexer<_TInterfaces extends Record<string, any> = { event: pFlex.TTFunc.Void }> {
    @property({ type: EventHandler })
    handlers: EventHandler[] = []

    @property({ type: JsonAsset })
    json: JsonAsset[] = []

    @property({  })
    isJsonFirst: boolean = true;

    @property({  })
    isCleanUpAfterEmit: boolean = false

    @property({ type: CCInteger, min: 0 })
    intMaxEmitCount: number = 0;

    @editor_property()
    protected _emitted: number = 0;

    emit(...args: any[]) {
        this._emitted++;
        const _out = this.isJsonFirst ? [
            pEngine.Json.event.invoke(this.json, ...args),
            EventHandler.emitEvents(this.handlers, ...args),
        ] : [
            EventHandler.emitEvents(this.handlers, ...args),
            pEngine.Json.event.invoke(this.json, ...args),
        ]

        if(this.intMaxEmitCount > 0 && this._emitted >= this.intMaxEmitCount) {
            this.handlers = [];
            this.json = []

            if(this.isCleanUpAfterEmit) {
                pEngine.Json.event.clean(this.json);
            }
        }
        return _out;
    }

    empty() {
        return this.handlers.length <= 0 && this.json.length <= 0
    }

}
