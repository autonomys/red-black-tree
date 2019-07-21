import {INode} from "./INode";
import {getNumberFromBytes, setNumberToBytes} from "./utils";

export class NodeBinaryMemory implements INode<Uint8Array, Uint8Array> {
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
        getNode: (offset: number) => NodeBinaryMemory,
    ): NodeBinaryMemory {
        const keySize = key.length;
        // Set `isRed` to `true`
        nodeData.set([1]);
        // Set left child to `null`
        setNumberToBytes(
            nodeData,
            1,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set right child to `null`
        setNumberToBytes(
            nodeData,
            1 + nodeOffsetBytes,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set key
        nodeData.set(key, 1 + nodeOffsetBytes * 2);
        // Set value
        nodeData.set(value, 1 + nodeOffsetBytes * 2 + keySize);

        return new NodeBinaryMemory(
            offset,
            key,
            value.length,
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
        getNode: (offset: number) => NodeBinaryMemory,
    ): NodeBinaryMemory {
        const baseOffset = 1 + nodeOffsetBytes * 2;
        return new NodeBinaryMemory(
            offset,
            nodeData.subarray(baseOffset, baseOffset + keySize),
            valueSize,
            nodeData,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
    }

    private isRedInternal: boolean;
    private leftCache: NodeBinaryMemory | null | undefined = undefined;
    private rightCache: NodeBinaryMemory | null | undefined = undefined;

    constructor(
        public readonly offset: number,
        public readonly key: Uint8Array,
        private readonly valueSize: number,
        private readonly nodeData: Uint8Array,
        private readonly nodeOffsetBytes: number,
        private readonly numberOfNodes: number,
        private readonly getNode: (offset: number) => NodeBinaryMemory,
    ) {
        this.isRedInternal = nodeData[0] === 1;
    }

    public get left(): NodeBinaryMemory | null {
        if (this.leftCache === undefined) {
            const offset = getNumberFromBytes(
                this.nodeData,
                1,
                this.nodeOffsetBytes,
            );

            this.leftCache = offset === this.numberOfNodes ? null : this.getNode(offset);
        }

        return this.leftCache;
    }

    public set left(node: NodeBinaryMemory | null) {
        setNumberToBytes(
            this.nodeData,
            1,
            this.nodeOffsetBytes,
            node ? node.offset : this.numberOfNodes,
        );

        this.leftCache = node;
    }

    public get right(): NodeBinaryMemory | null {
        if (this.rightCache === undefined) {
            const nodeOffsetBytes = this.nodeOffsetBytes;
            const offset = getNumberFromBytes(
                this.nodeData,
                1 + nodeOffsetBytes,
                nodeOffsetBytes,
            );

            this.rightCache = offset === this.numberOfNodes ? null : this.getNode(offset);
        }

        return this.rightCache;
    }

    public set right(node: NodeBinaryMemory | null) {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        setNumberToBytes(
            this.nodeData,
            1 + nodeOffsetBytes,
            nodeOffsetBytes,
            node ? node.offset : this.numberOfNodes,
        );

        this.rightCache = node;
    }

    public get value(): Uint8Array {
        const baseOffset = 1 + this.nodeOffsetBytes * 2 + this.key.length;
        return this.nodeData.subarray(baseOffset, baseOffset + this.valueSize);
    }
}
