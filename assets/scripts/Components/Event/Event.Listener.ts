import { _decorator, JsonAsset } from 'cc';
import { pTSAsset } from '../../pTSAsset';
import { pArray, pEngine } from '../../utils';

const { ccclass, property } = _decorator;

@ccclass('Event_Listener')
export class Event_Listener {
    @property({ type: JsonAsset })
    jsons: JsonAsset[] = [];

    @property({ type: pTSAsset })
    pTS: pTSAsset[] = [];

    static add(targets: pFlex.TArray<Event_Listener>, funcs: pFlex.TArray<pFlex.THandler>) {
        funcs = pArray.flatter(funcs);
        targets = pArray.flatter(targets);

        targets.forEach(target => target.add(funcs));
    }

    static remove(targets: pFlex.TArray<Event_Listener>, funcs: pFlex.TArray<pFlex.THandler>) {
        funcs = pArray.flatter(funcs);
        targets = pArray.flatter(targets);

        targets.forEach(target => target.remove(funcs));
    }

    add(func: pFlex.TArray<pFlex.THandler>, ...funcs: pFlex.THandler[]) {
        funcs = pArray.flat(func, funcs);

        pEngine.Json.event.add(this.jsons, ...funcs);
        pTSAsset.add(this.pTS, funcs);
    }

    remove(func: pFlex.TArray<pFlex.THandler>, ...funcs: pFlex.THandler[]) {
        funcs = pArray.flat(func, funcs);

        pEngine.Json.event.remove(this.jsons, ...funcs);
        pTSAsset.remove(this.pTS, funcs);
    }
}
