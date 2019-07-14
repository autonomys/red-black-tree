import {INode} from "./INode";
import {getOffsetFromBytes, setOffsetToBytes} from "./utils";

export class NodeBinaryRAM implements INode<Uint8Array, Uint8Array> {
    public get isRed(): boolean {
        return this.isRedInternal;
    }

    public set isRed(isRed: boolean) {
        if (isRed !== this.isRedInternal) {
            this.isRedInternal = isRed;
            this.nodeData.set([isRed ? 1 : 0]);
        }
    }

    public static create(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        nodeData: Uint8Array,
        offset: number,
        key: Uint8Array,
        value: Uint8Array,
        getNode: (offset: number) => NodeBinaryRAM,
    ): NodeBinaryRAM {
        const keySize = key.length;
        // Set `isRed` to `true`
        nodeData.set([1]);
        // Set left child to `null`
        setOffsetToBytes(
            nodeData.subarray(1, 1 + nodeOffsetBytes),
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set right child to `null`
        setOffsetToBytes(
            nodeData.subarray(1 + nodeOffsetBytes, 1 + nodeOffsetBytes * 2),
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set key
        nodeData.set(key, 1 + nodeOffsetBytes * 2);
        // Set value
        nodeData.set(value, 1 + nodeOffsetBytes * 2 + keySize);

        return new NodeBinaryRAM(
            offset,
            key,
            value,
            nodeData,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
    }

    public static read(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        nodeData: Uint8Array,
        offset: number,
        keySize: number,
        valueSize: number,
        getNode: (offset: number) => NodeBinaryRAM,
    ): NodeBinaryRAM {
        const baseOffset = 1 + nodeOffsetBytes * 2;
        return new NodeBinaryRAM(
            offset,
            nodeData.subarray(baseOffset, baseOffset + keySize),
            nodeData.subarray(baseOffset + keySize, baseOffset + keySize + valueSize),
            nodeData,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
    }

    private isRedInternal: boolean;

    // noinspection JSUnusedGlobalSymbols IDE incorrectly doesn't match `key` and `value` with interface
    constructor(
        public readonly offset: number,
        public readonly key: Uint8Array,
        public readonly value: Uint8Array,
        private readonly nodeData: Uint8Array,
        private readonly nodeOffsetBytes: number,
        private readonly numberOfNodes: number,
        private readonly getNode: (offset: number) => NodeBinaryRAM,
    ) {
        this.isRedInternal = nodeData[0] === 1;
    }

    public get left(): NodeBinaryRAM | null {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const offset = getOffsetFromBytes(
            this.nodeData.subarray(1, 1 + nodeOffsetBytes),
            nodeOffsetBytes,
        );

        return offset === this.numberOfNodes ? null : this.getNode(offset);
    }

    public set left(node: NodeBinaryRAM | null) {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        setOffsetToBytes(
            this.nodeData.subarray(
                1,
                1 + nodeOffsetBytes,
            ),
            node ? node.offset : this.numberOfNodes,
            nodeOffsetBytes,
        );
    }

    public get right(): NodeBinaryRAM | null {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const offset = getOffsetFromBytes(
            this.nodeData.subarray(
                1 + nodeOffsetBytes,
                1 + nodeOffsetBytes * 2,
            ),
            nodeOffsetBytes,
        );

        return offset === this.numberOfNodes ? null : this.getNode(offset);
    }

    public set right(node: NodeBinaryRAM | null) {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        setOffsetToBytes(
            this.nodeData.subarray(
                1 + nodeOffsetBytes,
                1 + nodeOffsetBytes * 2,
            ),
            node ? node.offset : this.numberOfNodes,
            nodeOffsetBytes,
        );
    }
}
