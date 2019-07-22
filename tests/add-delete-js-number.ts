import shuffle = require("shuffle-array");
import * as test from "tape";
import {INode, NodeManagerJsNumber, Tree} from "../src";

function validateRulesFollowed(t: test.Test, baseMessage: string, nodesManager: NodeManagerJsNumber<null>, expectedNumberOfNodes: number): void {
    const root = nodesManager.getRoot();
    if (root === null) {
        t.equal(expectedNumberOfNodes, 0, `${baseMessage}: Expected number of nodes is correct`);
        return;
    }

    t.ok(!root.getIsRed(), `${baseMessage}: Root is black`);
    t.equal(expectedNumberOfNodes, getNumberOfNotNullNodes(root), `${baseMessage}: Expected number of nodes is correct`);
    t.ok(checkOrder(root), `${baseMessage}: Order of nodes is correct`);
    t.ok(checkHeight(root), `${baseMessage}: Height of sub-trees is correct`);
}

function checkOrder(node: INode<number, null>): boolean {
    const left = node.getLeft();
    const right = node.getRight();
    if (!node.getIsRed()) {
        return (
            (
                !left ||
                checkOrder(left)
            ) &&
            (
                !right ||
                checkOrder(right)
            )
        );
    }
    return (
        (
            !left ||
            (
                !left.getIsRed() &&
                checkOrder(left)
            )
        ) &&
        (
            !right ||
            (
                !right.getIsRed() &&
                checkOrder(right)
            )
        )
    );
}

function checkHeight(node: INode<number, null>): boolean {
    return getHeight(node) !== false;
}

function getHeight(node: INode<number, null> | null): number | false {
    if (!node) {
        return 1;
    }
    const leftHeight = getHeight(node.getLeft());
    const rightHeight = getHeight(node.getRight());
    if (leftHeight !== rightHeight || leftHeight === false) {
        return false;
    }
    return (node.getIsRed() ? 0 : 1) + leftHeight;
}

function getNumberOfNotNullNodes(node: INode<number, null> | null): number {
    if (node === null) {
        return 0;
    }

    return 1 + getNumberOfNotNullNodes(node.getLeft()) + getNumberOfNotNullNodes(node.getRight());
}

test('Basic test', (t) => {
    const keys: number[] = [];
    for (let i = 0; i < 255; ++i) {
        keys.push(i);
    }
    shuffle(keys);

    for (let i = 1; i <= 10; ++i) {
        t.test(`Round ${i}`, (t) => {
            const nodeManager = new NodeManagerJsNumber<null>();
            const tree = new Tree(nodeManager);
            let expectedNumberOfNodes = 0;
            for (const key of keys) {
                ++expectedNumberOfNodes;
                tree.addNode(key, null);
                validateRulesFollowed(t, `Inserting key ${key}`, nodeManager, expectedNumberOfNodes);
            }
            shuffle(keys);

            for (const key of keys) {
                --expectedNumberOfNodes;
                tree.removeNode(key);
                validateRulesFollowed(t, `Deleting key ${key}`, nodeManager, expectedNumberOfNodes);
            }

            t.end();
        });
    }

    t.end();
});
