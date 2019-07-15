import {NodeManagerJs} from "./NodeManagerJs";

export class NodeManagerJsNumber<V> extends NodeManagerJs<number, V> {
    public compare(aKey: number, bKey: number): -1 | 0 | 1 {
        if (aKey === bKey) {
            return 0;
        }
        return aKey < bKey ? -1 : 1;
    }
}
