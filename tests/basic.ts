import shuffle = require("shuffle-array");
import * as test from "tape";
import {Node} from "../src/Node";
import {Tree} from "../src/Tree";

/**
 * Here we hack `root` property, which is an implementation detail, but needed for tests to run
 */
interface ITreeWithRoot {
    root: Node<null>;
}

function validateRulesFollowed(t: test.Test, baseMessage: string, tree: ITreeWithRoot, expectedNumberOfNodes: number): void {
    if (tree.root === null) {
        t.equal(expectedNumberOfNodes, 0, `${baseMessage}: Expected number of nodes is correct`);
        return;
    }

    t.ok(!tree.root.isRed, `${baseMessage}: Root is black`);
    t.equal(expectedNumberOfNodes, getNumberOfNotNullNodes(tree.root), `${baseMessage}: Expected number of nodes is correct`);
    t.ok(checkOrder(tree.root), `${baseMessage}: Order of nodes is correct`);
    t.ok(checkHeight(tree.root), `${baseMessage}: Height of sub-trees is correct`);
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
        return false;
    }
    return (node.isRed ? 0 : 1) + leftHeight;
}

function getNumberOfNotNullNodes(node: Node<null> | null): number {
    if (node === null) {
        return 0;
    }

    return 1 + getNumberOfNotNullNodes(node.left) + getNumberOfNotNullNodes(node.right);
}

test('Basic test', (t) => {
    const keys: Uint8Array[] = [];
    for (let i = 0; i < 255; ++i) {
        keys.push(Uint8Array.of(i));
    }
    shuffle(keys);

    for (let i = 1; i <= 10; ++i) {
        t.test(`Round ${i}`, (t) => {
            const tree = new Tree() as ITreeWithRoot & Tree;
            let expectedNumberOfNodes = 0;
            for (const key of keys) {
                ++expectedNumberOfNodes;
                tree.addNode(key, null);
                validateRulesFollowed(t, `Inserting key ${key[0]}`, tree, expectedNumberOfNodes);
            }
            shuffle(keys);

            for (const key of keys) {
                --expectedNumberOfNodes;
                tree.removeNode(key);
                validateRulesFollowed(t, `Deleting key ${key[0]}`, tree, expectedNumberOfNodes);
            }

            t.end();
        });
    }

    t.end();
});
