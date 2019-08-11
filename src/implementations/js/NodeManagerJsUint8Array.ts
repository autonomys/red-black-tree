import {compareUint8Array, uint8ArraysDiff} from "../../utils";
import {NodeManagerJs} from "./NodeManagerJs";

export class NodeManagerJsUint8Array<V> extends NodeManagerJs<Uint8Array, V> {
    public compare = compareUint8Array;
    public distance = uint8ArraysDiff;
}
