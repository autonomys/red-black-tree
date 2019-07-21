import {INode} from "./interfaces/INode";
import {INodeManagerBase} from "./interfaces/INodeManagerBase";
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

export function fixTree<K, V>(nodeManager: INodeManagerBase<K, V>, path: Array<INode<K, V>>): void {
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
        const grandParentLeft = grandParent.getLeft();
        const grandParentRight = grandParent.getRight();
        const uncle = grandParentLeft === parent ? grandParentRight : grandParentLeft;
        // Here we handle `null` as black `nil` node implicitly, since we do not create `nil` nodes as such
        if (uncle && uncle.getIsRed()) {
            parent.setIsRed(!parent.getIsRed());
            grandParent.setIsRed(grandParent === nodeManager.getRoot() ? false : !grandParent.getIsRed());
            uncle.setIsRed(false);
            path.push(grandParent);
            continue;
        }

        // Triangle cases
        if (
            parent.getLeft() === targetNode &&
            grandParentRight === parent
        ) {
            rotateRight(nodeManager, parent, grandParent);
            path.push(grandParent, targetNode, parent);
            continue;
        } else if (
            parent.getRight() === targetNode &&
            grandParentLeft === parent
        ) {
            rotateLeft(nodeManager, parent, grandParent);
            path.push(grandParent, targetNode, parent);
            continue;
        }

        const grandGrandParent = path.pop() || null;
        // Line cases
        if (parent.getLeft() === targetNode) {
            rotateRight(nodeManager, grandParent, grandGrandParent);
        } else {
            rotateLeft(nodeManager, grandParent, grandGrandParent);
        }
        parent.setIsRed(!parent.getIsRed());
        grandParent.setIsRed(!grandParent.getIsRed());
        break;
    }
}

/**
 * @param nodeManager
 * @param rotationNode
 * @param parent       `null` if `rotationNode` is root
 */
function rotateLeft<K, V>(nodeManager: INodeManagerBase<K, V>, rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
    const originalRightNode = rotationNode.getRight();
    if (!originalRightNode) {
        throw new RuntimeError('Right children of rotation node is null, this should never happen');
    }
    rotationNode.setRight(originalRightNode.getLeft());
    originalRightNode.setLeft(rotationNode);

    rotateFixParentConnection(nodeManager, rotationNode, originalRightNode, parent);
}

/**
 * @param nodeManager
 * @param rotationNode
 * @param parent       `null` if `rotationNode` is root
 */
function rotateRight<K, V>(nodeManager: INodeManagerBase<K, V>, rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
    const originalLeftNode = rotationNode.getLeft();
    if (!originalLeftNode) {
        throw new RuntimeError('Left children of rotation node is null, this should never happen');
    }
    rotationNode.setLeft(originalLeftNode.getRight());
    originalLeftNode.setRight(rotationNode);

    rotateFixParentConnection(nodeManager, rotationNode, originalLeftNode, parent);
}

function rotateFixParentConnection<K, V>(nodeManager: INodeManagerBase<K, V>, rotationNode: INode<K, V>, originalNode: INode<K, V>, parent: INode<K, V> | null): void {
    if (parent) {
        if (parent.getLeft() === rotationNode) {
            parent.setLeft(originalNode);
        } else {
            parent.setRight(originalNode);
        }
    } else {
        nodeManager.setRoot(originalNode);
    }
}

export function removeNodeImplementation<K, V>(nodeManager: INodeManagerBase<K, V>, path: Array<INode<K, V>>): void {
    const nodeToRemove = path.pop() as INode<K, V>;
    const parentNode = path.pop() || null;
    const xPath = path.slice();
    const xAndReplacement = determineXAndReplacement(nodeToRemove, parentNode, xPath);
    const [x, replacement] = xAndReplacement;
    let replacementParent = xAndReplacement[2];

    if (!parentNode) {
        if (!replacement) {
            throw new Error('Deleting root mode, but replacement is null, this should never happen');
        }
        nodeManager.setRoot(replacement);
    } else {
        if (parentNode.getLeft() === nodeToRemove) {
            parentNode.setLeft(replacement);
        } else {
            parentNode.setRight(replacement);
        }
    }

    if (replacement) {
        const nodeToRemoveLeft = nodeToRemove.getLeft();
        const nodeToRemoveRight = nodeToRemove.getRight();
        if (nodeToRemoveRight === replacement) {
            replacement.setLeft(nodeToRemoveLeft);
            if (replacement !== x) {
                replacement.setRight(x);
                replacementParent = replacement;
                xPath.pop();
            }
        } else if (nodeToRemoveLeft === replacement) {
            replacement.setRight(nodeToRemoveRight);
            if (replacement !== x) {
                replacement.setLeft(x);
                replacementParent = replacement;
                xPath.pop();
            }
        } else {
            replacement.setLeft(nodeToRemoveLeft);
            replacement.setRight(nodeToRemoveRight);
            if (replacementParent) {
                if (replacementParent.getLeft() === replacement) {
                    replacementParent.setLeft(x);
                } else {
                    replacementParent.setRight(x);
                }
            }
        }
    }

    const nodeToRemoveIsRed = nodeToRemove.getIsRed();
    if (
        nodeToRemoveIsRed &&
        (
            !replacement ||
            replacement.getIsRed()
        )
    ) {
        return;
    }

    if (
        nodeToRemoveIsRed &&
        replacement &&
        !replacement.getIsRed()
    ) {
        replacement.setIsRed(true);
        handleRemovalCases(nodeManager, x, replacementParent, xPath);
        return;
    }

    if (
        !nodeToRemoveIsRed &&
        replacement &&
        replacement.getIsRed()
    ) {
        replacement.setIsRed(false);
        return;
    }

    handleRemovalCases(nodeManager, x, replacementParent, xPath);
}

/**
 * @param nodeToRemove
 * @param nodeToRemoveParent
 * @param xPath
 *
 * @return [x, replacement, replacementParent, replacementToTheLeft]
 */
function determineXAndReplacement<K, V>(
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

function handleRemovalCases<K, V>(nodeManager: INodeManagerBase<K, V>, x: INode<K, V> | null, xParent: INode<K, V> | null, xPath: Array<INode<K, V>>): void {
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
                rotateLeft(nodeManager, xParent, xParentParent);
            } else {
                rotateRight(nodeManager, xParent, xParentParent);
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
                rotateRight(nodeManager, w, xParent);
            } else {
                rotateLeft(nodeManager, w, xParent);
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
                rotateLeft(nodeManager, xParent, xParentParent);
            } else if (xParent.getRight() === x) {
                const left = w.getLeft();
                if (left) {
                    left.setIsRed(false);
                }
                rotateRight(nodeManager, xParent, xParentParent);
            }
            return;
        }
    }
}
