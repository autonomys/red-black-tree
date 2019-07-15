import shuffle = require("shuffle-array");
import * as test from "tape";
import {INode, Tree} from "../src";
import {NodeManagerBinaryMemory} from "../src/NodeManagerBinaryMemory";

function validateRulesFollowed(t: test.Test, baseMessage: string, nodesManager: NodeManagerBinaryMemory, expectedNumberOfNodes: number): void {
    if (nodesManager.root === null) {
        t.equal(expectedNumberOfNodes, 0, `${baseMessage}: Expected number of nodes is correct`);
        return;
    }

    t.ok(!nodesManager.root.isRed, `${baseMessage}: Root is black`);
    t.equal(expectedNumberOfNodes, getNumberOfNotNullNodes(nodesManager.root), `${baseMessage}: Expected number of nodes is correct`);
    t.ok(checkOrder(nodesManager.root), `${baseMessage}: Order of nodes is correct`);
    t.ok(checkHeight(nodesManager.root), `${baseMessage}: Height of sub-trees is correct`);
}

function checkOrder(node: INode<Uint8Array, Uint8Array>): boolean {
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

function checkHeight(node: INode<Uint8Array, Uint8Array>): boolean {
    return getHeight(node) !== false;
}

function getHeight(node: INode<Uint8Array, Uint8Array> | null): number | false {
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

function getNumberOfNotNullNodes(node: INode<Uint8Array, Uint8Array> | null): number {
    if (node === null) {
        return 0;
    }

    return 1 + getNumberOfNotNullNodes(node.left) + getNumberOfNotNullNodes(node.right);
}

test('Basic test', (t) => {
    const keys: number[] = [];
    for (let i = 0; i < 255; ++i) {
        keys.push(i);
    }

    for (let i = 1; i <= 10; ++i) {
        t.test(`Round ${i}`, (t) => {
            const nodeManager = NodeManagerBinaryMemory.create(300, 1, 0);
            const tree = new Tree(nodeManager);
            let expectedNumberOfNodes = 0;
            for (const key of keys) {
                ++expectedNumberOfNodes;
                tree.addNode(Uint8Array.of(key), new Uint8Array(0));
                validateRulesFollowed(t, `Inserting key ${key}`, nodeManager, expectedNumberOfNodes);
            }
            shuffle(keys);

            for (const key of keys) {
                --expectedNumberOfNodes;
                tree.removeNode(Uint8Array.of(key));
                validateRulesFollowed(t, `Deleting key ${key}`, nodeManager, expectedNumberOfNodes);
            }

            t.end();
        });
    }

    t.end();
});
