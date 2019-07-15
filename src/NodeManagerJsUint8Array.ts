import {NodeManagerJs} from "./NodeManagerJs";
import {compareUint8Array} from "./utils";

export class NodeManagerJsUint8Array<V> extends NodeManagerJs<Uint8Array, V> {
    public compare = compareUint8Array;
}
