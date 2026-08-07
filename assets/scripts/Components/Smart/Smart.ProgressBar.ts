import { _decorator, Label, ProgressBar } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Smart_ProgressBar')
export class Smart_ProgressBar extends ProgressBar {
    @property({})
    multiplier: number = 100;
    @property({})
    prefix: string = '';

    @property({ type: [Label] })
    labels: Label[] = [];

    @property({})
    suffix: string = '%';

    @property({})
    isChildrenCollector: boolean = true;

    protected __preload(): void {
        if (!this.isChildrenCollector) return;
        if (!this.labels.length) {
            this.labels = this.getComponentsInChildren(Label);
            return;
        }
        const existing = new Set(this.labels);
        for (const _lab of this.getComponentsInChildren(Label)) {
            if (!existing.has(_lab)) this.labels.push(_lab);
        }
    }

    set progress(value: number) {
        super.progress = value;

        for (let i = this.labels.length - 1; i >= 0; i--) {
            const _lab = this.labels[i];
            if (!_lab || !_lab.isValid) {
                this.labels.splice(i, 1);
                continue;
            }
            _lab.string = this.prefix + (value * this.multiplier).toFixed(0) + this.suffix;
        }
        console.log(`Smart_ProgressBar: progress set to ${value}, labels updated.`);
    }

    get progress(): number {
        return super.progress;
    }


}
