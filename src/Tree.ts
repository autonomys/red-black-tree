import {INode} from "./INode";
import {INodeManager} from "./INodeManager";
import {RuntimeError} from "./RuntimeError";

function isNullOrBlack<K, V>(node: INode<K, V> | null): boolean {
    return (
        !node ||
        !node.getIsRed()
    );
}

function isRed<K, V>(node: INode<K, V> | null): boolean {
    return Boolean(node && node.getIsRed());
}

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
            nodeToInsert.setIsRed(false);
            nodeManager.setRoot(nodeToInsert);
        } else {
            let currentNode = root;
            const path: Array<INode<K, V>> = [];
            while (true) {
                path.push(currentNode);
                switch (nodeManager.compare(nodeToInsert.getKey(), currentNode.getKey())) {
                    case -1:
                        const left = currentNode.getLeft();
                        if (left) {
                            currentNode = left;
                            break;
                        } else {
                            currentNode.setLeft(nodeToInsert);
                            path.push(nodeToInsert);
                            this.fixTree(path);
                            return;
                        }
                    case 1:
                        const right = currentNode.getRight();
                        if (right) {
                            currentNode = right;
                            break;
                        } else {
                            currentNode.setRight(nodeToInsert);
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
        if (!root.getLeft() && !root.getRight()) {
            nodeManager.setRoot(null);
            return;
        }
        let currentNode = root;
        const path: Array<INode<K, V>> = [];
        while (true) {
            path.push(currentNode);
            switch (nodeManager.compare(key, currentNode.getKey())) {
                case -1:
                    const left = currentNode.getLeft();
                    if (left) {
                        currentNode = left;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                case 1:
                    const right = currentNode.getRight();
                    if (right) {
                        currentNode = right;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                default:
                    if (currentNode === root && !root.getLeft() && !root.getRight()) {
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
            switch (nodeManager.compare(targetKey, currentNode.getKey())) {
                case -1:
                    const left = currentNode.getLeft();
                    if (left) {
                        currentNode = left;
                        break;
                    } else {
                        return currentNode.getKey();
                    }
                case 1:
                    const right = currentNode.getRight();
                    if (right) {
                        currentNode = right;
                        break;
                    } else {
                        return currentNode.getKey();
                    }
                default:
                    return currentNode.getKey();
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
            if (!parent.getIsRed()) {
                return;
            }
            const grandParent = path.pop();
            if (!grandParent) {
                parent.setIsRed(false);
                return;
            }
            const uncle = grandParent.getLeft() === parent ? grandParent.getRight() : grandParent.getLeft();
            // Here we handle `null` as black `nil` node implicitly, since we do not create `nil` nodes as such
            if (uncle && uncle.getIsRed()) {
                parent.setIsRed(!parent.getIsRed());
                grandParent.setIsRed(grandParent === this.nodeManager.getRoot() ? false : !grandParent.getIsRed());
                uncle.setIsRed(false);
                path.push(grandParent);
                continue;
            }

            // Triangle cases
            if (
                parent.getLeft() === targetNode &&
                grandParent.getRight() === parent
            ) {
                this.rotateRight(parent, grandParent);
                path.push(grandParent, targetNode, parent);
                continue;
            } else if (
                parent.getRight() === targetNode &&
                grandParent.getLeft() === parent
            ) {
                this.rotateLeft(parent, grandParent);
                path.push(grandParent, targetNode, parent);
                continue;
            }

            const grandGrandParent = path.pop() || null;
            // Line cases
            if (parent.getLeft() === targetNode) {
                this.rotateRight(grandParent, grandGrandParent);
            } else {
                this.rotateLeft(grandParent, grandGrandParent);
            }
            parent.setIsRed(!parent.getIsRed());
            grandParent.setIsRed(!grandParent.getIsRed());
            break;
        }
    }

    /**
     * @param rotationNode
     * @param parent       `null` if `rotationNode` is root
     */
    private rotateLeft(rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
        const originalRightNode = rotationNode.getRight();
        if (!originalRightNode) {
            throw new RuntimeError('Right children of rotation node is null, this should never happen');
        }
        rotationNode.setRight(originalRightNode.getLeft());
        originalRightNode.setLeft(rotationNode);

        this.rotateFixParentConnection(rotationNode, originalRightNode, parent);
    }

    /**
     * @param rotationNode
     * @param parent       `null` if `rotationNode` is root
     */
    private rotateRight(rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
        const originalLeftNode = rotationNode.getLeft();
        if (!originalLeftNode) {
            throw new RuntimeError('Left children of rotation node is null, this should never happen');
        }
        rotationNode.setLeft(originalLeftNode.getRight());
        originalLeftNode.setRight(rotationNode);

        this.rotateFixParentConnection(rotationNode, originalLeftNode, parent);
    }

    private rotateFixParentConnection(rotationNode: INode<K, V>, originalNode: INode<K, V>, parent: INode<K, V> | null): void {
        if (parent) {
            if (parent.getLeft() === rotationNode) {
                parent.setLeft(originalNode);
            } else {
                parent.setRight(originalNode);
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
            if (parentNode.getLeft() === nodeToRemove) {
                parentNode.setLeft(replacement);
            } else {
                parentNode.setRight(replacement);
            }
        }

        if (replacement) {
            if (nodeToRemove.getRight() === replacement) {
                replacement.setLeft(nodeToRemove.getLeft());
                if (replacement !== x) {
                    replacement.setRight(x);
                    replacementParent = replacement;
                    xPath.pop();
                }
            } else if (nodeToRemove.getLeft() === replacement) {
                replacement.setRight(nodeToRemove.getRight());
                if (replacement !== x) {
                    replacement.setLeft(x);
                    replacementParent = replacement;
                    xPath.pop();
                }
            } else {
                replacement.setLeft(nodeToRemove.getLeft());
                replacement.setRight(nodeToRemove.getRight());
                if (replacementParent) {
                    if (replacementParent.getLeft() === replacement) {
                        replacementParent.setLeft(x);
                    } else {
                        replacementParent.setRight(x);
                    }
                }
            }
        }

        if (
            nodeToRemove.getIsRed() &&
            (
                !replacement ||
                replacement.getIsRed()
            )
        ) {
            return;
        }

        if (
            nodeToRemove.getIsRed() &&
            replacement &&
            !replacement.getIsRed()
        ) {
            replacement.setIsRed(true);
            this.handleRemovalCases(x, replacementParent, xPath);
            return;
        }

        if (
            !nodeToRemove.getIsRed() &&
            replacement &&
            replacement.getIsRed()
        ) {
            replacement.setIsRed(false);
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
        const nodeToRemoveLeft = nodeToRemove.getLeft();
        const nodeToRemoveRight = nodeToRemove.getRight();
        if (!nodeToRemoveLeft || !nodeToRemoveRight) {
            const replacement = nodeToRemoveLeft || nodeToRemoveRight;
            return [
                replacement,
                replacement,
                replacement ? nodeToRemove : nodeToRemoveParent,
                Boolean(nodeToRemoveLeft),
            ];
        }

        let replacement = nodeToRemoveRight;
        let replacementParent = nodeToRemove;
        if (nodeToRemoveParent) {
            xPath.push(nodeToRemoveParent);
        }
        const xPathExtra: Array<INode<K, V>> = [];
        let left: INode<K, V> | null = replacement.getLeft();
        while (left) {
            replacementParent = replacement;
            replacement = left;
            xPathExtra.push(replacementParent);
            left = replacement.getLeft();
        }
        xPathExtra.pop();
        xPath.push(replacement, ...xPathExtra);

        return [
            replacement.getRight(),
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
            if (!xParent.getLeft() && !xParent.getRight()) {
                xParent.setIsRed(false);
                return;
            }

            // Case 0
            if (x && x.getIsRed()) {
                x.setIsRed(false);
                return;
            }

            let w = xParent.getLeft() === x ? xParent.getRight() : xParent.getLeft();

            // Case 1
            if (
                (
                    !x ||
                    !x.getIsRed()
                ) &&
                (
                    w &&
                    w.getIsRed()
                )
            ) {
                w.setIsRed(false);
                xParent.setIsRed(true);
                const xParentParent = xPath.pop() || null;
                if (xParent.getLeft() === x) {
                    this.rotateLeft(xParent, xParentParent);
                } else {
                    this.rotateRight(xParent, xParentParent);
                }
                xPath.push(w);

                w = xParent.getLeft() === x ? xParent.getRight() : xParent.getLeft();
            }

            // Case 2
            if (
                (
                    !x ||
                    !x.getIsRed()
                ) &&
                w &&
                !w.getIsRed() &&
                (
                    isNullOrBlack(w.getLeft()) &&
                    isNullOrBlack(w.getRight())
                )
            ) {
                w.setIsRed(true);
                x = xParent;
                if (x.getIsRed()) {
                    x.setIsRed(false);
                    return;
                } else {
                    xParent = xPath.pop() as INode<K, V>;
                    if (!xParent) {
                        return;
                    }
                    w = xParent.getLeft() === x ? xParent.getRight() : xParent.getLeft();
                    continue;
                }
            }

            // Case 3
            if (
                (
                    !x ||
                    !x.getIsRed()
                ) &&
                w &&
                !w.getIsRed() &&
                (
                    (
                        xParent.getLeft() === x &&
                        isRed(w.getLeft()) &&
                        isNullOrBlack(w.getRight())
                    ) ||
                    (
                        xParent.getRight() === x &&
                        isRed(w.getRight()) &&
                        isNullOrBlack(w.getLeft())
                    )
                )
            ) {
                if (xParent.getLeft() === x) {
                    const left = w.getLeft();
                    if (left) {
                        left.setIsRed(false);
                    }
                } else if (xParent.getRight() === x) {
                    const right = w.getRight();
                    if (right) {
                        right.setIsRed(false);
                    }
                }
                w.setIsRed(true);
                if (xParent.getLeft() === x) {
                    this.rotateRight(w, xParent);
                } else {
                    this.rotateLeft(w, xParent);
                }
                w = xParent.getLeft() === x ? xParent.getRight() : xParent.getLeft();
            }

            // Case 4
            if (
                (
                    !x ||
                    !x.getIsRed()
                ) &&
                w &&
                !w.getIsRed() &&
                (
                    (
                        xParent.getLeft() === x &&
                        isRed(w.getRight())
                    ) ||
                    (
                        xParent.getRight() === x &&
                        isRed(w.getLeft())
                    )
                )
            ) {
                w.setIsRed(xParent.getIsRed());
                xParent.setIsRed(false);
                const xParentParent = xPath.pop() || null;
                if (xParent.getLeft() === x) {
                    const right = w.getRight();
                    if (right) {
                        right.setIsRed(false);
                    }
                    this.rotateLeft(xParent, xParentParent);
                } else if (xParent.getRight() === x) {
                    const left = w.getLeft();
                    if (left) {
                        left.setIsRed(false);
                    }
                    this.rotateRight(xParent, xParentParent);
                }
                return;
            }
        }
    }
}
