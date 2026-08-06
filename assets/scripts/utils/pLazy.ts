import { Enum } from "cc";
import * as pArray from "./pArray";

export function enums(obj: pFlex.TArray<object>, ...objs: object[]): void {
    objs = pArray.flat(obj, objs);
    for(const _obj of objs) {
        Enum(_obj);
    }
}
