import { __private, _decorator, Asset, Director, director } from "cc";
import { pDriver } from "./utils";

const { ccclass } = _decorator;

@ccclass("pTSAsset")
export class pTSAsset<_TInterfaces extends Record<string, any> = Record<string, pFlex.TFunc>> extends Asset {
    protected _onLoad?(): void;
    protected _onReleased?(): void;
    protected _isLoaded: boolean = false;

    protected hydrate(depsPromise?: Promise<any>): void {
        if (this._isLoaded) return;
        this._isLoaded = true;

        const scenePromise = new Promise<void>((resolve) => {
            if (director.getScene()) {
                resolve();
            } else {
                director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => resolve(), this);
            }
        });

        const readyPromise = Promise.all([scenePromise, depsPromise || Promise.resolve()]);
        readyPromise.then(() => {
            try {
                this._onAwake?.();
            } catch (err) {
                console.error(`[pTSAsset] Error in _onAwake for ${(this as any).name || this.constructor.name}:`, err);
            }
        });

        this._onLoad?.();
    }
    protected _driver = pDriver.Handler.create<_TInterfaces>();

    //@ts-ignore
    override on<_TKey extends keyof _TInterfaces>(key: _TKey, func: _TInterfaces[_TKey], binder: any): void {
        this._driver.on(key, { func, binder });
    }

    //@ts-ignore
    override once<_TKey extends keyof _TInterfaces>(key: _TKey, func: _TInterfaces[_TKey], binder: any): void {
        this._driver.once(key, { func, binder });
    }

    //@ts-ignore
    override off<_TKey extends keyof _TInterfaces>(key: _TKey, callback: _TInterfaces[_TKey], binder: any): void {
        this._driver.off(key as any, callback, binder);
    }

    //@ts-ignore
    override emit<_TKey extends keyof _TInterfaces>(type: _TKey, ..._params: Parameters<_TInterfaces[_TKey]>) {
        return this._driver.emit(type, ..._params);
    }

    destroy(): boolean {
        const _out = super.destroy();
        this._onReleased?.();
        return _out;
    }

    protected _onAwake?(): void
}
