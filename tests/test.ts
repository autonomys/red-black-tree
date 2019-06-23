import shuffle = require("shuffle-array");
import * as test from "tape";
import {Node} from "../src/Node";
import {Tree} from "../src/Tree";

/**
 * Here we hack `root` property, which is an implementation detail, but needed for tests to run
 */
type ITreeWithRoot<V> = { root: Node<Uint8Array> | null } & Tree<V>;

// @ts-ignore
function validateRulesFollowed(tree: ITreeWithRoot<null>): boolean {
    return true;
}

test('Basic test', (t) => {
    const keys: Uint8Array[] = [];
    for (let i = 0; i < 255; ++i) {
        keys.push(Uint8Array.of(i));
    }
    shuffle(keys);

    const tree = new Tree() as ITreeWithRoot<null>;
    for (const key of keys) {
        tree.addNode(key, null);
        t.ok(validateRulesFollowed(tree), `Inserting key ${key[0]}`);
    }

    t.end();
});
