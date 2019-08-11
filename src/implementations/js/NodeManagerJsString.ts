import {uint8ArraysDiff} from "../../utils";
import {NodeManagerJs} from "./NodeManagerJs";

const encoder = new TextEncoder();

export class NodeManagerJsString<V> extends NodeManagerJs<string, V> {
    public compare(aKey: string, bKey: string): -1 | 0 | 1 {
        if (aKey === bKey) {
            return 0;
        }
        return aKey < bKey ? -1 : 1;
    }

    public distance(aKey: string, bKey: string): bigint {
        return uint8ArraysDiff(encoder.encode(aKey), encoder.encode(bKey));
    }
}
