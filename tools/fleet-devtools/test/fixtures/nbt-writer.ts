/**
 * Minimal NBT writer for test fixtures.
 *
 * The bundled prismarine-nbt 2.x writer mangles array payloads on this
 * Node version, so this module emits NBT bytes directly. Only the subset
 * needed for synthetic Anvil chunks is implemented.
 */
import { Buffer } from 'node:buffer';

const TAG_END = 0x00;
const TAG_BYTE = 0x01;
const TAG_SHORT = 0x02;
const TAG_INT = 0x04;
const TAG_LONG = 0x0c;
const TAG_STRING = 0x08;
const TAG_LIST = 0x09;
const TAG_COMPOUND = 0x0a;
const TAG_INT_ARRAY = 0x0b;
const TAG_LONG_ARRAY = 0x0c;

export type NbtValue =
  | { type: 'byte'; value: number }
  | { type: 'short'; value: number }
  | { type: 'int'; value: number }
  | { type: 'long'; value: [number, number] } // [high, low]
  | { type: 'longBigint'; value: bigint }
  | { type: 'string'; value: string }
  | { type: 'byteArray'; value: number[] }
  | { type: 'intArray'; value: number[] }
  | { type: 'longArray'; value: Array<[number, number]> | bigint[] }
  | { type: 'list'; value: NbtValue[]; childType: number }
  | { type: 'compound'; value: Array<[string, NbtValue]> };

function writeShortString(name: string): Buffer {
  const buf = Buffer.alloc(2 + Buffer.byteLength(name, 'utf8'));
  buf.writeUInt16BE(Buffer.byteLength(name, 'utf8'), 0);
  buf.write(name, 2, 'utf8');
  return buf;
}

function writePayload(value: NbtValue): Buffer {
  switch (value.type) {
    case 'byte': {
      const buf = Buffer.alloc(1);
      buf.writeInt8(value.value, 0);
      return buf;
    }
    case 'short': {
      const buf = Buffer.alloc(2);
      buf.writeInt16BE(value.value, 0);
      return buf;
    }
    case 'int': {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(value.value, 0);
      return buf;
    }
    case 'longBigint': {
      const buf = Buffer.alloc(8);
      buf.writeBigInt64BE(value.value, 0);
      return buf;
    }
    case 'long': {
      const buf = Buffer.alloc(8);
      buf.writeInt32BE(value.value[0], 0);
      buf.writeInt32BE(value.value[1], 4);
      return buf;
    }
    case 'string': {
      const buf = Buffer.alloc(2 + Buffer.byteLength(value.value, 'utf8'));
      buf.writeUInt16BE(Buffer.byteLength(value.value, 'utf8'), 0);
      buf.write(value.value, 2, 'utf8');
      return buf;
    }
    case 'byteArray': {
      const buf = Buffer.alloc(4 + value.value.length);
      buf.writeInt32BE(value.value.length, 0);
      for (let i = 0; i < value.value.length; i += 1) {
        buf.writeInt8(value.value[i]!, 4 + i);
      }
      return buf;
    }
    case 'intArray': {
      const buf = Buffer.alloc(4 + value.value.length * 4);
      buf.writeInt32BE(value.value.length, 0);
      for (let i = 0; i < value.value.length; i += 1) {
        buf.writeInt32BE(value.value[i]!, 4 + i * 4);
      }
      return buf;
    }
    case 'longArray': {
      const count = value.value.length;
      const buf = Buffer.alloc(4 + count * 8);
      buf.writeInt32BE(count, 0);
      for (let i = 0; i < count; i += 1) {
        const item = value.value[i]!;
        if (typeof item === 'bigint') {
          buf.writeBigInt64BE(item, 4 + i * 8);
        } else {
          buf.writeInt32BE(item[0], 4 + i * 8);
          buf.writeInt32BE(item[1], 4 + i * 8 + 4);
        }
      }
      return buf;
    }
    case 'list': {
      const head = Buffer.alloc(5);
      head.writeInt8(value.childType, 0);
      head.writeInt32BE(value.value.length, 1);
      const children = Buffer.concat(value.value.map(writePayload));
      return Buffer.concat([head, children]);
    }
    case 'compound': {
      const children: Buffer[] = [];
      for (const [name, child] of value.value) {
        const tagHeader = Buffer.alloc(1);
        tagHeader.writeInt8(tagTypeCode(child), 0);
        children.push(tagHeader, writeShortString(name), writePayload(child));
      }
      const end = Buffer.alloc(1);
      end.writeInt8(TAG_END, 0);
      return Buffer.concat([...children, end]);
    }
  }
}

function tagTypeCode(value: NbtValue): number {
  switch (value.type) {
    case 'byte':
      return TAG_BYTE;
    case 'short':
      return TAG_SHORT;
    case 'int':
      return TAG_INT;
    case 'long':
    case 'longBigint':
      return TAG_LONG;
    case 'string':
      return TAG_STRING;
    case 'byteArray':
    case 'intArray':
    case 'longArray': {
      if (value.type === 'byteArray') return 0x07;
      if (value.type === 'intArray') return TAG_INT_ARRAY;
      return TAG_LONG_ARRAY;
    }
    case 'list':
      return TAG_LIST;
    case 'compound':
      return TAG_COMPOUND;
  }
}

export function writeNamedRootCompound(name: string, value: NbtValue): Buffer {
  if (value.type !== 'compound') {
    throw new Error('Root NBT value must be a compound');
  }
  const tagHeader = Buffer.alloc(1);
  tagHeader.writeInt8(TAG_COMPOUND, 0);
  return Buffer.concat([tagHeader, writeShortString(name), writePayload(value)]);
}

export const NbtTag = {
  byte: (value: number): NbtValue => ({ type: 'byte', value }),
  short: (value: number): NbtValue => ({ type: 'short', value }),
  int: (value: number): NbtValue => ({ type: 'int', value }),
  long: (value: [number, number]): NbtValue => ({ type: 'long', value }),
  longBigint: (value: bigint): NbtValue => ({ type: 'longBigint', value }),
  string: (value: string): NbtValue => ({ type: 'string', value }),
  byteArray: (value: number[]): NbtValue => ({ type: 'byteArray', value }),
  intArray: (value: number[]): NbtValue => ({ type: 'intArray', value }),
  longArray: (value: Array<[number, number]> | bigint[]): NbtValue => ({
    type: 'longArray',
    value,
  }),
  list: (childType: number, value: NbtValue[]): NbtValue => ({ type: 'list', childType, value }),
  compound: (value: Array<[string, NbtValue]>): NbtValue => ({ type: 'compound', value }),
};
