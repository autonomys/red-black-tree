import shuffle = require("shuffle-array");
import * as test from "tape";
import {Node} from "../src/Node";
import {Tree} from "../src/Tree";

/**
 * Here we hack `root` property, which is an implementation detail, but needed for tests to run
 */
interface ITreeWithRoot {
    root: Node<Uint8Array> | null;
}

// @ts-ignore
function validateRulesFollowed(tree: ITreeWithRoot<null>): boolean {
    return (
        checkOrder(tree.root) &&
        checkHeight(tree.root)
    );
}

function checkOrder(node: Node<null>): boolean {
    if (!node.isRed) {
        return (
            (
                !node.left ||
                checkOrder(node.left)
            ) &&
            (
                !node.right ||
                checkOrder(node.right)
            )
        );
    }
    return (
        (
            !node.left ||
            (
                !node.left.isRed &&
                checkOrder(node.left)
            )
        ) &&
        (
            !node.right ||
            (
                !node.right.isRed &&
                checkOrder(node.right)
            )
        )
    );
}

function checkHeight(node: Node<null>): boolean {
    return getHeight(node) !== false;
}

function getHeight(node: Node<null> | null): number | false {
    if (!node) {
        return 1;
    }
    const leftHeight = getHeight(node.left);
    const rightHeight = getHeight(node.right);
    if (leftHeight !== rightHeight || leftHeight === false) {
        console.log(leftHeight, rightHeight);
        return false;
    }
    return (node.isRed ? 0 : 1) + leftHeight;
}

test('Basic test', (t) => {
    const keys: Uint8Array[] = [];
    for (let i = 0; i < 255; ++i) {
        keys.push(Uint8Array.of(i));
    }
    shuffle(keys);

    const tree = new Tree() as ITreeWithRoot & Tree;
    for (const key of keys) {
        tree.addNode(key, null);
        t.ok(validateRulesFollowed(tree), `Inserting key ${key[0]}`);
    }

    t.end();
});
