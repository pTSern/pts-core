
import { _decorator } from 'cc';
import { Smart_Label_Hooker } from './Smart.Label.Hooker';
import { editor_property } from 'db://pts-core/scripts/utils/pClass';
import { pConst, pLazy } from 'db://pts-core/scripts/utils';

const { ccclass, property } = _decorator;

enum _ETimerType {
    Two,
    Three,
    Four,
}

pLazy.enums(_ETimerType);

@ccclass('Smart_Label_Hooker_CountDown._Character')
class _Character {
    @property({  })
    public space: string = ":";
    @property({  })
    public digit: string = "D2";
    @property({  })
    public day: string = "d";
    @property({  })
    public hour: string = "h";
    @property({  })
    public minute: string = "m";
    @property({  })
    public second: string = "s";
    @property({  })
    public default: string = "--:--";

    get match() {
        return this.digit.match(/\d+/);
    }
}

@ccclass('Smart_Label_Hooker_CountDown')
export class Smart_Label_Hooker_CountDown extends Smart_Label_Hooker<number> {

    @property({ type: _ETimerType, group: pConst.GROUPS.CORE })
    public type: _ETimerType = _ETimerType.Two;

    @property({ min: 0, group: pConst.GROUPS.CORE })
    public ticker: number = 1;

    @property({ group: pConst.GROUPS.CORE })
    public isUseUnscaledTime: boolean = false;

    @property({ type: _Character, group: pConst.GROUPS.CONFIG })
    public character: _Character = new _Character();

    @editor_property()
    private _duration: number = 0;
    private _timerTimeoutId: ReturnType<typeof setTimeout> | null = null;
    @editor_property()
    private _isCancelled: boolean = false;

    public start(): void {
        this.string = this.character.default
    }

    public set(duration: number): void {
        this.clear();
        this._duration = duration;
        this.actUpdateText(Math.floor(this._duration));
        this._countdown();
    }

    private async _countdown(): Promise<void> {
        this._isCancelled = false;

        while (!this._isCancelled && this._duration > 0) {
            const delayMs = this.ticker * 1000;

            await new Promise<void>(_rs => 
                this._timerTimeoutId = setTimeout(_rs, delayMs)
            );

            if (this._isCancelled) break;

            this._duration -= this.ticker;
            this.actUpdateText(Math.floor(this._duration));
        }
    }

    public actUpdateText(time: number): void {
        if (time <= 0) {
            //this.emit('onTimerFinished');
        }

        this.string = this._convertSecondToTime(time);

        //this.emit('onTimerRemainUpdate', time);
    }

    public _onClear(): void {
        this._isCancelled = true;
        if (this._timerTimeoutId !== null) {
            clearTimeout(this._timerTimeoutId);
            this._timerTimeoutId = null;
        }
    }

    private _convertSecondToTime(duration: number): string {
        if (duration < 0) {
            return this.character.default;
        }

        // Equivalent to System.TimeSpan calculations
        const days = Math.floor(duration / 86400);
        const hours = Math.floor((duration % 86400) / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = Math.floor(duration % 60);

        const pad = (num: number): string => {
            const match = this.character.match;
            const padLength = match ? parseInt(match[0], 10) : 2;
            return num.toString().padStart(padLength, "0");
        };

        const cs = this.character.space;
        const cd = this.character.day;
        const ch = this.character.hour;
        const cm = this.character.minute;
        const csed = this.character.second;

        switch (this.type) {
            case _ETimerType.Two:
                if (days > 0) {
                    return `${pad(days)}${cd}${cs}${pad(hours)}${ch}`;
                }
                if (hours > 0) {
                    return `${pad(hours)}${ch}${cs}${pad(minutes)}${cm}`;
                }
                return `${pad(minutes)}${cm}${cs}${pad(seconds)}${csed}`;

            case _ETimerType.Three:
                if (days > 0) {
                    return `${pad(days)}${cd}${cs}${pad(hours)}${ch}${cs}${pad(minutes)}${cm}`;
                }
                if (hours > 0) {
                    return `${pad(hours)}${ch}${cs}${pad(minutes)}${cm}${cs}${pad(seconds)}${csed}`;
                }
                return `${pad(minutes)}${cm}${cs}${pad(seconds)}${csed}`;

            case _ETimerType.Four:
                if (days > 0) {
                    return `${pad(days)}${cd}${cs}${pad(hours)}${ch}${cs}${pad(minutes)}${cm}${cs}${pad(seconds)}${csed}`;
                }
                if (hours > 0) {
                    return `${pad(hours)}${ch}${cs}${pad(minutes)}${cm}${cs}${pad(seconds)}${csed}`;
                }
                return `${pad(minutes)}${cm}${cs}${pad(seconds)}${csed}`;

            default:
                return `${pad(hours)}${ch}${cs}${pad(minutes)}${cm}${cs}${pad(seconds)}${csed}`;
        }
    }

    get(): number {
        return this._duration;
    }

    protected _actLookUpBinder(...args: any[]): void {
        for(const _arg of args) {
            if(typeof _arg === 'number') {
                this.set(_arg);
                return;
            }
        }
    }
}
