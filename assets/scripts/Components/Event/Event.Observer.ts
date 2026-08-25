import { _decorator, CCBoolean, CCInteger, CCString, JsonAsset } from 'cc';
import { Event_Driver } from './Event.Driver';
import { editor_property } from '../../utils/pClass';
import { pConst, pEngine } from '../../utils';

const { ccclass, property } = _decorator;

interface _I {
    onComplete: pFlex.TTFunc.Void;
}

@ccclass('Event_Observer')
export class Event_Observer extends Event_Driver<_I> {
    static _$bounces = ['onComplete'];

    @property({ type: JsonAsset, group: pConst.GROUPS.get('Listener') })
    actInitialize: JsonAsset[] = [];

    @property({ type: JsonAsset, group: pConst.GROUPS.get('Listener') })
    actComplete: JsonAsset[] = [];

    @editor_property()
    protected _sealed: boolean = false

    @editor_property([CCString])
    protected get _$keys() {
        return Object.keys(this._map);
    }
    @editor_property([CCBoolean])
    protected get _$values() {
        return Object.values(this._map);
    }
    protected _map: Record<string, any> = {};

    protected _onPreLoad(): void {
        pEngine.Json.event.add(this.actInitialize, { func: this._onInitLookUp, binder: this });
        pEngine.Json.event.add(this.actComplete, { func: this._onCompleteLookUp, binder: this });
    }

    protected _onInitLookUp(...args: any[]) {
        if(this._sealed) return;

        let _code = void 0;
        for(const code of args) {
            if(typeof code !== 'string') continue;
            _code = code;
            break;
        }

        console.log('Event_Observer._onInitLookUp', _code, this._map);
        if(!_code) return;
        if(!!this._map[_code]) return
        this._map[_code] = false;
    }

    protected _onCompleteLookUp(...args: any[]) {
        if(this._sealed) return;

        let _code = void 0;
        for(const code of args) {
            if(typeof code !== 'string') continue;
            _code = code;
            break;
        }

        console.log('Event_Observer._onCompleteLookUp', _code, this._map);
        this._map[_code] = true;
        if(Object.values(this._map).every(_ => _ === true)) {
            this._sealed = true;
            this.emit('onComplete');
        }
    }
}
