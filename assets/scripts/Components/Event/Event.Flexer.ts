import { _decorator, CCInteger, EventHandler, JsonAsset } from 'cc';
import { pArray, pClass, pEngine } from '../../utils';
import { editor_property } from '../../utils/pClass';
import { pTSAsset_Emitter, pTSAsset_Handler } from '../../pTSAsset/pTSAsset.Event';

const { ccclass, property } = _decorator;

@ccclass('Event_Flexer')
export class Event_Flexer<_TInterfaces extends Record<string, any> = { event: pFlex.TTFunc.Void }> {
    @property({ type: EventHandler })
    handlers: EventHandler[] = []

    @property({ type: JsonAsset })
    json: JsonAsset[] = []

    @property({  })
    isJsonFirst: boolean = true;

    @property({ type: pTSAsset_Emitter })
    emmiter: pTSAsset_Emitter[] = []

    @property({ type: pTSAsset_Handler })
    handler: pTSAsset_Handler[] = []

    @property({  })
    isCleanUpAfterEmit: boolean = false

    @property({ type: CCInteger, min: 0 })
    intMaxEmitCount: number = 0;

    @editor_property()
    protected _emitted: number = 0;

    protected _binders: Set<pFlex.IBinder> = new Set();
    emit(...args: any[]) {
        this._emitted++;
        const _out = this.isJsonFirst ? [
            pEngine.Json.event.invoke(this.json, ...args),
            EventHandler.emitEvents(this.handlers, ...args),
        ] : [
            EventHandler.emitEvents(this.handlers, ...args),
            pEngine.Json.event.invoke(this.json, ...args),
        ]

        this.emmiter.forEach(_pTS => _out.push(_pTS.emit(...args)));
        this.handler.forEach(_pTS => _out.push(_pTS.emit(...args)));
        pClass.emit(this._binders, ...args);

        if(this.intMaxEmitCount > 0 && this._emitted >= this.intMaxEmitCount) {
            this.handlers = [];
            this.json = []

            if(this.isCleanUpAfterEmit) {
                pEngine.Json.event.clean(this.json);
            }
        }
        return _out;
    }

    purge() {
        this.handlers = [];
        this.json = []
        this.emmiter = []
        this.handler = []
        this._emitted = 0;
        this._binders.clear();
    }

    empty() {
        return this.handlers.length <= 0 && this.json.length <= 0
    }

    add(handler: pFlex.TArray<pFlex.THandler>, ...handles: pFlex.THandler[]) {
        handles = pArray.flatter(handler, ...handles);
        pClass.mapper(handles).forEach(_handle => this._binders.add(_handle));
    }

    remove(handler: pFlex.TArray<pFlex.THandler>, ...handles: pFlex.THandler[]) {
        handles = pArray.flatter(handler, ...handles);
        pClass.mapper(handles).forEach(_handle => this._binders.delete(_handle));
    }

}
