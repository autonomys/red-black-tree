import {compareUint8Array} from "../../utils";
import {NodeManagerJs} from "./NodeManagerJs";

export class NodeManagerJsUint8Array<V> extends NodeManagerJs<Uint8Array, V> {
    public compare = compareUint8Array;
}
