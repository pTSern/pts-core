import { _decorator, EventHandler, JsonAsset } from 'cc';
import { pEngine } from '../../utils';

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

    emit(...args: any[]) {
        const _out = this.isJsonFirst ? [
            pEngine.Json.event.invoke(this.json, ...args),
            EventHandler.emitEvents(this.handlers, ...args),
        ] : [
            EventHandler.emitEvents(this.handlers, ...args),
            pEngine.Json.event.invoke(this.json, ...args),
        ]

        if(this.isCleanUpAfterEmit) {
            this.handlers = [];
            pEngine.Json.event.clean(this.json);
            this.json = [];
        }

        return _out;
    }

    empty() {
        return this.handlers.length <= 0 && this.json.length <= 0
    }

}
