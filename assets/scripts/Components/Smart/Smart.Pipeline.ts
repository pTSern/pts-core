import { _decorator } from "cc";
import { Event_Awaitable } from "../Event/Event.Awaitable";
import { Smart_StartUp } from "./Smart.StartUp";

const { ccclass, property } = _decorator

@ccclass("Smart_Pipeline.Pipeline")
class _Pipeline {
    @property({ type: Event_Awaitable })
    awaiter: Event_Awaitable[] = []

    async execute() {
        return Promise.all(this.awaiter.map(a => a.wait()));
    }
}

@ccclass("Smart_Pipeline")
export class Smart_Pipeline extends Smart_StartUp {
    @property({ type: _Pipeline })
    pipeline: _Pipeline[] = []

    protected async _onExecute(): Promise<void> {
        while(this.pipeline.length) {
            const _pipe = this.pipeline.shift();
            if(!_pipe) continue;
            await _pipe.execute();
        }
    }
    protected _onPause(): void {
    }
    protected _onResume(): void {
    }
    protected _onStop(): void {
    }


}
