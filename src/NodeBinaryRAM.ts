import {INode} from "./INode";

export class NodeBinaryRAM implements INode<Uint8Array, Uint8Array> {
    public isRed: boolean = true;
    public left: INode<Uint8Array, Uint8Array> | null = null;
    public right: INode<Uint8Array, Uint8Array> | null = null;

    constructor(
        public readonly key: Uint8Array,
        public readonly offset: number,
        public readonly value: Uint8Array,
    ) {
    }
}
