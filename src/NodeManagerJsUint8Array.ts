import {NodeManagerJs} from "./NodeManagerJs";

export class NodeManagerJsUint8Array<V> extends NodeManagerJs<Uint8Array, V> {
    public compare(aKey: Uint8Array, bKey: Uint8Array): -1 | 0 | 1 {
        const length = aKey.length;
        for (let i = 0; i < length; ++i) {
            const diff = aKey[i] - bKey[i];
            if (diff < 0) {
                return -1;
            } else if (diff > 0) {
                return 1;
            }
        }
        return 0;
    }
}
