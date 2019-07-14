/* tslint:disable:no-bitwise */
import {INodeManager} from "./INodeManager";
import {NodeBinaryRAM} from "./NodeBinaryRAM";
import {RuntimeError} from "./RuntimeError";

function maxNumberToBits(maxNumber: number): number {
    if (maxNumber < 2 ** 8) {
        return 1;
    }
    if (maxNumber < 2 ** 16) {
        return 2;
    }
    if (maxNumber < 2 ** 24) {
        return 3;
    }
    if (maxNumber < 2 ** 32) {
        return 4;
    }
    throw new RuntimeError("Can't store that many nodes");
}

function getOffsetFromBytes(source: Uint8Array, nodeOffsetBytes: number): number {
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    switch (nodeOffsetBytes) {
        case 4:
            return view.getUint32(0, false);
        case 3:
            return (view.getUint8(0) << 16) + view.getUint16(1, false);
        case 2:
            return view.getUint16(0, false);
        case 1:
            return view.getUint8(0);
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}

function setOffsetToBytes(source: Uint8Array, nodeOffsetBytes: number, offset: number): void {
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    switch (nodeOffsetBytes) {
        case 4:
            view.setUint32(0, offset, false);
            return;
        case 3:
            view.setUint8(0, offset >> 16);
            view.setUint16(1, offset % (2 ** 16), false);
            return;
        case 2:
            view.setUint16(0, offset, false);
            return;
        case 1:
            view.setUint8(0, offset);
            return;
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}

/**
 * Node manager implementation that can work with any data type supported in Node.js as a value
 */
export class NodeManagerBinaryRAM implements INodeManager<Uint8Array, Uint8Array> {
    public get root(): NodeBinaryRAM | null {
        const offset = this.getRootNodeOffset();
        return offset === this.numberOfNodes ? null : this.getNode(offset);
    }

    public set root(node: NodeBinaryRAM | null) {
        if (node === null) {
            this.setRootNodeOffset(this.numberOfNodes);
        } else {
            this.setRootNodeOffset(node.offset);
        }
    }

    private constructor(
        private readonly uint8Array: Uint8Array,
        private readonly numberOfNodes: number,
        private readonly nodeOffsetBytes: number,
        private readonly nodeMetadataSize: number,
        private readonly keySize: number,
        private readonly valueSize: number,
        private readonly singleNodeAllocationSize: number,
    ) {
        // TODO
    }

    /**
     * @param numberOfNodes Max number of nodes that are expected to be stored
     * @param keySize Size of the key in bytes
     * @param valueSize Size of the values associated with a key in bytes
     */
    public create(numberOfNodes: number, keySize: number, valueSize: number): NodeManagerBinaryRAM {
        // offset starts from 0, but addresses with index of last possible node + 1 will be treated as `null` node for everyone to reference
        const nodeOffsetBytes = Math.ceil(maxNumberToBits(numberOfNodes) / 8);
        // 1 byte for red/black flag and 2 * nodeOffsetBytes for left and right children
        const nodeMetadataSize = Math.ceil(1 + nodeOffsetBytes * 2);
        const singleNodeAllocationSize = nodeMetadataSize + keySize + valueSize;
        /**
         * * one offset for the first free offset for the next node to be inserted
         * * one offset for last deleted node that can be used to add another node
         * * one offset for root node offset
         */
        const commonMetadataSize = nodeOffsetBytes * 3;
        const allocationSize = commonMetadataSize + numberOfNodes * singleNodeAllocationSize;
        const buffer = Buffer.allocUnsafe(allocationSize);
        const uint8Array = new Uint8Array(buffer.buffer);

        const instance = new NodeManagerBinaryRAM(
            uint8Array,
            numberOfNodes,
            nodeOffsetBytes,
            nodeMetadataSize,
            keySize,
            valueSize,
            singleNodeAllocationSize,
        );

        instance.setFreeNodeOffset(0);
        instance.setDeletedNodeOffset(numberOfNodes);
        instance.setRootNodeOffset(numberOfNodes);

        return instance;
    }

    public addNode(key: Uint8Array, value: Uint8Array): NodeBinaryRAM {
        const numberOfNodes = this.numberOfNodes;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const offset = this.getFreeNodeOffset();
        if (offset !== numberOfNodes) {
            this.setFreeNodeOffset(offset + 1);
            // TODO: Key and value must be stored in `this.uint8array`
            return new NodeBinaryRAM(key, offset, value);
        } else {
            const offset = this.getDeletedNodeOffset();
            if (offset === numberOfNodes) {
                throw new RuntimeError("No space left for new nodes");
            }
            const deletedNode = this.uint8Array.subarray(
                nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
                nodeOffsetBytes * 3 + singleNodeAllocationSize * (offset + 1),
            );
            // By convention deleted node stores offset of previous deleted node in its first bytes
            const previousOffset = getOffsetFromBytes(deletedNode, nodeOffsetBytes);
            this.setDeletedNodeOffset(previousOffset);
            // TODO: Key and value must be stored in `this.uint8array`
            return new NodeBinaryRAM(key, offset, value);
        }
    }

    public compare(aKey: Uint8Array, bKey: Uint8Array): -1 | 0 | 1 {
        const length = aKey.length;
        for (let i = 0; i < length; ++i) {
            const diff = aKey[i] - bKey[i];
            if (diff < 0) {
                return -1;
            } else if (diff > 0) {
                return 1;
            }
        }
        return 0;
    }

    public removeNode(): void {
        // TODO
    }

    private getNode(offset: number): NodeBinaryRAM {
        // TODO
    }

    private getFreeNodeOffset(): number {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const nextFreeNode = this.uint8Array.subarray(0, nodeOffsetBytes);
        return getOffsetFromBytes(nextFreeNode, nodeOffsetBytes);
    }

    private setFreeNodeOffset(offset: number): void {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const nextFreeNode = this.uint8Array.subarray(0, nodeOffsetBytes);
        setOffsetToBytes(nextFreeNode, nodeOffsetBytes, offset);
    }

    private getDeletedNodeOffset(): number {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const lastDeletedNode = this.uint8Array.subarray(nodeOffsetBytes, nodeOffsetBytes * 2);
        return getOffsetFromBytes(lastDeletedNode, nodeOffsetBytes);
    }

    private setDeletedNodeOffset(offset: number): void {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const lastDeletedNode = this.uint8Array.subarray(nodeOffsetBytes, nodeOffsetBytes * 2);
        setOffsetToBytes(lastDeletedNode, nodeOffsetBytes, offset);
    }

    private getRootNodeOffset(): number {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const rootNode = this.uint8Array.subarray(nodeOffsetBytes * 2, nodeOffsetBytes * 3);
        return getOffsetFromBytes(rootNode, nodeOffsetBytes);
    }

    private setRootNodeOffset(offset: number): void {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const rootNode = this.uint8Array.subarray(nodeOffsetBytes * 2, nodeOffsetBytes * 3);
        setOffsetToBytes(rootNode, nodeOffsetBytes, offset);
    }
}
