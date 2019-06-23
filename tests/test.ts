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
    // let blackHeight = 1;
    // let currentNode = tree.root;
    // while (currentNode.left) {
    //     if (!currentNode.isRed) {
    //         ++blackHeight;
    //     }
    //     currentNode = currentNode.left;
    // }
    return checkLevel(tree.root);
}

function checkLevel(node: Node<null>): boolean {
    if (!node.isRed) {
        return (
            (
                !node.left ||
                checkLevel(node.left)
            ) &&
            (
                !node.right ||
                checkLevel(node.right)
            )
        );
    }
    return (
        (
            !node.left ||
            (
                !node.left.isRed &&
                checkLevel(node.left)
            )
        ) &&
        (
            !node.right ||
            (
                !node.right.isRed &&
                checkLevel(node.right)
            )
        )
    );
}

test('Basic test', (t) => {
    const keys: Uint8Array[] = [];
    for (let i = 0; i < 255; ++i) {
        keys.push(Uint8Array.of(i));
    }
    shuffle(keys);
    // const keys: Uint8Array[] = [
    //     Uint8Array.of(5),
    //     Uint8Array.of(6),
    //     Uint8Array.of(1),
    //     Uint8Array.of(8),
    //     Uint8Array.of(4),
    //     Uint8Array.of(2),
    // ];

    const tree = new Tree() as ITreeWithRoot & Tree;
    for (const key of keys) {
        if (key[0] === 2) {
            debugger;
        }
        tree.addNode(key, null);
        t.ok(validateRulesFollowed(tree), `Inserting key ${key[0]}`);
    }

    t.end();
});
