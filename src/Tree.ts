import {INode} from "./INode";
import {INodeManager} from "./INodeManager";
import {RuntimeError} from "./RuntimeError";

/**
 * Resources used to write this:
 * * https://www.youtube.com/playlist?list=PL9xmBV_5YoZNqDI8qfOZgzbqahCUmUEin
 * * https://www.youtube.com/watch?v=YCo2-H2CL6Q
 * * https://www.youtube.com/watch?v=eO3GzpCCUSg
 */
export class Tree<K, V> {
    constructor(private nodeManager: INodeManager<K, V>) {
    }

    /**
     * Add nodes to a tree one by one (for incremental updates)
     *
     * @param key  A key to be indexed, e.g. a 32 byte piece id
     * @param value Value to be associated with a key
     */
    public addNode(key: K, value: V): void {
        this.addNodeInternal(key, value);
        this.nodeManager.cleanup();
    }

    /**
     * Remove a node from the tree
     *
     * @param key A key to be removed, e.g. a 32 byte piece id
     */
    public removeNode(key: K): void {
        this.removeNodeInternal(key);
        this.nodeManager.cleanup();
    }

    /**
     * Get the closest node/key in a tree to a given target in the same key space
     *
     * @param targetKey The target for evaluation, e.g. a challenge in the same key space
     *
     * @return The closest key to the challenge or `null` if no nodes are available
     */
    public getClosestNode(targetKey: K): K | null {
        const result = this.getClosestNodeInternal(targetKey);
        this.nodeManager.cleanup();
        return result;
    }

    private addNodeInternal(key: K, value: V): void {
        const nodeManager = this.nodeManager;
        const nodeToInsert = nodeManager.addNode(key, value);

        const root = nodeManager.getRoot();
        if (!root) {
            nodeToInsert.isRed = false;
            nodeManager.setRoot(nodeToInsert);
        } else {
            let currentNode = root;
            const path: Array<INode<K, V>> = [];
            while (true) {
                path.push(currentNode);
                switch (nodeManager.compare(nodeToInsert.key, currentNode.key)) {
                    case -1:
                        if (currentNode.left) {
                            currentNode = currentNode.left;
                            break;
                        } else {
                            currentNode.left = nodeToInsert;
                            path.push(nodeToInsert);
                            this.fixTree(path);
                            return;
                        }
                    case 1:
                        if (currentNode.right) {
                            currentNode = currentNode.right;
                            break;
                        } else {
                            currentNode.right = nodeToInsert;
                            path.push(nodeToInsert);
                            this.fixTree(path);
                            return;
                        }
                    default:
                        // We do not insert the same key again
                        return;
                }
            }
        }
    }

    // /**
    //  * Add nodes to tree as a batch, should pre-sort and add in desired order for efficiency
    //  *
    //  * @param keySet A set unique keys to be indexed in the tree
    //  */
    // public addNodeSet(keySet: Uint8Array[]) {
    // }

    private removeNodeInternal(key: K): void {
        const nodeManager = this.nodeManager;
        const root = nodeManager.getRoot();

        if (!root) {
            throw new Error("Tree is empty, nothing to delete");
        }
        if (!root.left && !root.right) {
            nodeManager.setRoot(null);
            return;
        }
        let currentNode = root;
        const path: Array<INode<K, V>> = [];
        while (true) {
            path.push(currentNode);
            switch (nodeManager.compare(key, currentNode.key)) {
                case -1:
                    if (currentNode.left) {
                        currentNode = currentNode.left;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                case 1:
                    if (currentNode.right) {
                        currentNode = currentNode.right;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                default:
                    if (currentNode === root && !root.left && !root.right) {
                        nodeManager.setRoot(null);
                        return;
                    }
                    this.removeNodeImplementation(path);
                    nodeManager.removeNode(currentNode);
                    return;
            }
        }
    }

    private getClosestNodeInternal(targetKey: K): K | null {
        const nodeManager = this.nodeManager;
        let currentNode = nodeManager.getRoot();
        if (!currentNode) {
            return null;
        }
        while (true) {
            switch (nodeManager.compare(targetKey, currentNode.key)) {
                case -1:
                    if (currentNode.left) {
                        currentNode = currentNode.left;
                        break;
                    } else {
                        return currentNode.key;
                    }
                case 1:
                    if (currentNode.right) {
                        currentNode = currentNode.right;
                        break;
                    } else {
                        return currentNode.key;
                    }
                default:
                    return currentNode.key;
            }
        }
    }

    private fixTree(path: Array<INode<K, V>>): void {
        while (path.length) {
            const targetNode = path.pop();
            if (!targetNode) {
                throw new RuntimeError("Can't fix path without target node, this should never happen");
            }
            const parent = path.pop();
            // `targetNode` is root, nothing left to do
            if (!parent) {
                return;
            }
            // No conflict, nothing left to do
            if (!parent.isRed) {
                return;
            }
            const grandParent = path.pop();
            if (!grandParent) {
                parent.isRed = false;
                return;
            }
            const uncle = grandParent.left === parent ? grandParent.right : grandParent.left;
            // Here we handle `null` as black `nil` node implicitly, since we do not create `nil` nodes as such
            if (uncle && uncle.isRed) {
                parent.isRed = !parent.isRed;
                grandParent.isRed = grandParent === this.nodeManager.getRoot() ? false : !grandParent.isRed;
                uncle.isRed = false;
                path.push(grandParent);
                continue;
            }

            // Triangle cases
            if (
                parent.left === targetNode &&
                grandParent.right === parent
            ) {
                this.rotateRight(parent, grandParent);
                path.push(grandParent, targetNode, parent);
                continue;
            } else if (
                parent.right === targetNode &&
                grandParent.left === parent
            ) {
                this.rotateLeft(parent, grandParent);
                path.push(grandParent, targetNode, parent);
                continue;
            }

            const grandGrandParent = path.pop() || null;
            // Line cases
            if (parent.left === targetNode) {
                this.rotateRight(grandParent, grandGrandParent);
            } else {
                this.rotateLeft(grandParent, grandGrandParent);
            }
            parent.isRed = !parent.isRed;
            grandParent.isRed = !grandParent.isRed;
            break;
        }
    }

    /**
     * @param rotationNode
     * @param parent       `null` if `rotationNode` is root
     */
    private rotateLeft(rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
        const originalRightNode = rotationNode.right;
        if (!originalRightNode) {
            throw new RuntimeError('Right children of rotation node is null, this should never happen');
        }
        rotationNode.right = originalRightNode.left;
        originalRightNode.left = rotationNode;

        this.rotateFixParentConnection(rotationNode, originalRightNode, parent);
    }

    /**
     * @param rotationNode
     * @param parent       `null` if `rotationNode` is root
     */
    private rotateRight(rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
        const originalLeftNode = rotationNode.left;
        if (!originalLeftNode) {
            throw new RuntimeError('Left children of rotation node is null, this should never happen');
        }
        rotationNode.left = originalLeftNode.right;
        originalLeftNode.right = rotationNode;

        this.rotateFixParentConnection(rotationNode, originalLeftNode, parent);
    }

    private rotateFixParentConnection(rotationNode: INode<K, V>, originalNode: INode<K, V>, parent: INode<K, V> | null): void {
        if (parent) {
            if (parent.left === rotationNode) {
                parent.left = originalNode;
            } else {
                parent.right = originalNode;
            }
        } else {
            this.nodeManager.setRoot(originalNode);
        }
    }

    // /**
    //  * Save the current in-memory Tree to disk
    //  *
    //  * @param path The location on disk for storage. Should be cross-platform.
    //  */
    // public save(path: string) {
    // }
    //
    // /**
    //  * Read an existing tree from disk into memory.
    //  *
    //  * @param path The location where the tree is saved to disk. Should be cross-platform
    //  */
    // public open(path: string): Tree {
    // }

    private removeNodeImplementation(path: Array<INode<K, V>>): void {
        const nodeToRemove = path.pop() as INode<K, V>;
        const parentNode = path.pop() || null;
        const xPath = path.slice();
        const xAndReplacement = this.determineXAndReplacement(nodeToRemove, parentNode, xPath);
        const [x, replacement] = xAndReplacement;
        let replacementParent = xAndReplacement[2];

        if (!parentNode) {
            if (!replacement) {
                throw new Error('Deleting root mode, but replacement is null, this should never happen');
            }
            this.nodeManager.setRoot(replacement);
        } else {
            if (parentNode.left === nodeToRemove) {
                parentNode.left = replacement;
            } else {
                parentNode.right = replacement;
            }
        }

        if (replacement) {
            if (nodeToRemove.right === replacement) {
                replacement.left = nodeToRemove.left;
                if (replacement !== x) {
                    replacement.right = x;
                    replacementParent = replacement;
                    xPath.pop();
                }
            } else if (nodeToRemove.left === replacement) {
                replacement.right = nodeToRemove.right;
                if (replacement !== x) {
                    replacement.left = x;
                    replacementParent = replacement;
                    xPath.pop();
                }
            } else {
                replacement.left = nodeToRemove.left;
                replacement.right = nodeToRemove.right;
                if (replacementParent) {
                    if (replacementParent.left === replacement) {
                        replacementParent.left = x;
                    } else {
                        replacementParent.right = x;
                    }
                }
            }
        }

        if (
            nodeToRemove.isRed &&
            (
                !replacement ||
                replacement.isRed
            )
        ) {
            return;
        }

        if (
            nodeToRemove.isRed &&
            replacement &&
            !replacement.isRed
        ) {
            replacement.isRed = true;
            this.handleRemovalCases(x, replacementParent, xPath);
            return;
        }

        if (
            !nodeToRemove.isRed &&
            replacement &&
            replacement.isRed
        ) {
            replacement.isRed = false;
            return;
        }

        this.handleRemovalCases(x, replacementParent, xPath);
    }

    /**
     * @param nodeToRemove
     * @param nodeToRemoveParent
     * @param xPath
     *
     * @return [x, replacement, replacementParent, replacementToTheLeft]
     */
    private determineXAndReplacement(
        nodeToRemove: INode<K, V>,
        nodeToRemoveParent: INode<K, V> | null,
        xPath: Array<INode<K, V>>,
    ): [
        INode<K, V> | null,
        INode<K, V> | null,
        INode<K, V> | null,
        boolean
    ] {
        if (!nodeToRemove.left || !nodeToRemove.right) {
            const replacement = nodeToRemove.left || nodeToRemove.right;
            return [
                replacement,
                replacement,
                replacement ? nodeToRemove : nodeToRemoveParent,
                Boolean(nodeToRemove.left),
            ];
        }

        let replacement = nodeToRemove.right;
        let replacementParent = nodeToRemove;
        if (nodeToRemoveParent) {
            xPath.push(nodeToRemoveParent);
        }
        const xPathExtra: Array<INode<K, V>> = [];
        while (replacement.left) {
            replacementParent = replacement;
            replacement = replacement.left;
            xPathExtra.push(replacementParent);
        }
        xPathExtra.pop();
        xPath.push(replacement, ...xPathExtra);

        return [
            replacement.right,
            replacement,
            replacementParent,
            false,
        ];
    }

    private handleRemovalCases(x: INode<K, V> | null, xParent: INode<K, V> | null, xPath: Array<INode<K, V>>): void {
        while (true) {
            if (!xParent) {
                return;
            }
            if (!xParent.left && !xParent.right) {
                xParent.isRed = false;
                return;
            }

            // Case 0
            if (x && x.isRed) {
                x.isRed = false;
                return;
            }

            let w = xParent.left === x ? xParent.right : xParent.left;

            // Case 1
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                (
                    w &&
                    w.isRed
                )
            ) {
                w.isRed = false;
                xParent.isRed = true;
                const xParentParent = xPath.pop() || null;
                if (xParent.left === x) {
                    this.rotateLeft(xParent, xParentParent);
                } else {
                    this.rotateRight(xParent, xParentParent);
                }
                xPath.push(w);

                w = xParent.left === x ? xParent.right : xParent.left;
            }

            // Case 2
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                w &&
                !w.isRed &&
                (
                    (
                        !w.left ||
                        !w.left.isRed
                    ) &&
                    (
                        !w.right ||
                        !w.right.isRed
                    )
                )
            ) {
                w.isRed = true;
                x = xParent;
                if (x.isRed) {
                    x.isRed = false;
                    return;
                } else {
                    xParent = xPath.pop() as INode<K, V>;
                    if (!xParent) {
                        return;
                    }
                    w = xParent.left === x ? xParent.right : xParent.left;
                    continue;
                }
            }

            // Case 3
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                w &&
                !w.isRed &&
                (
                    (
                        xParent.left === x &&
                        w.left &&
                        w.left.isRed &&
                        (
                            !w.right ||
                            !w.right.isRed
                        )
                    ) ||
                    (
                        xParent.right === x &&
                        w.right &&
                        w.right.isRed &&
                        (
                            !w.left ||
                            !w.left.isRed
                        )
                    )
                )
            ) {
                if (xParent.left === x) {
                    if (w.left) {
                        w.left.isRed = false;
                    }
                } else if (xParent.right === x) {
                    if (w.right) {
                        w.right.isRed = false;
                    }
                }
                w.isRed = true;
                if (xParent.left === x) {
                    this.rotateRight(w, xParent);
                } else {
                    this.rotateLeft(w, xParent);
                }
                w = xParent.left === x ? xParent.right : xParent.left;
            }

            // Case 4
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                w &&
                !w.isRed &&
                (
                    (
                        xParent.left === x &&
                        w.right &&
                        w.right.isRed
                    ) ||
                    (
                        xParent.right === x &&
                        w.left &&
                        w.left.isRed
                    )
                )
            ) {
                w.isRed = xParent.isRed;
                xParent.isRed = false;
                const xParentParent = xPath.pop() || null;
                if (xParent.left === x) {
                    if (w.right) {
                        w.right.isRed = false;
                    }
                    this.rotateLeft(xParent, xParentParent);
                } else if (xParent.right === x) {
                    if (w.left) {
                        w.left.isRed = false;
                    }
                    this.rotateRight(xParent, xParentParent);
                }
                return;
            }
        }
    }
}
