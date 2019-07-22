import {NodeManagerJs} from "./NodeManagerJs";

export class NodeManagerJsString<V> extends NodeManagerJs<string, V> {
    public compare(aKey: string, bKey: string): -1 | 0 | 1 {
        if (aKey === bKey) {
            return 0;
        }
        return aKey < bKey ? -1 : 1;
    }
}
