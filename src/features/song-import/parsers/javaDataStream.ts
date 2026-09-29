// Data-only reader for the Java serialization subset used by Holyrics exports.
// No Java classes are loaded and no serialized methods are executed.
// Protocol: https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/protocol.html
export type JavaObject = {
  kind: 'object';
  className: string;
  fields: Map<string, JavaValue>;
  annotations: Map<string, JavaValue[]>;
};
type Descriptor = {
  kind: 'descriptor'; name: string; flags: number;
  fields: { type: string; name: string }[]; parent: Descriptor | null;
};
export type JavaValue = null | string | number | boolean | bigint | Uint8Array | JavaObject | Descriptor | JavaValue[];

export function readJavaDataStream(buffer: ArrayBuffer): JavaValue {
  if (buffer.byteLength > 10 * 1024 * 1024) throw new Error('El archivo supera 10 MB');
  const view = new DataView(buffer);
  let offset = 0;
  let tokens = 0;
  const handles: JavaValue[] = [];
  const fail = (): never => { throw new Error(`Archivo Holyrics dañado o versión no compatible (posición ${offset})`); };
  const take = (size: number) => {
    if (!Number.isSafeInteger(size) || size < 0 || offset + size > view.byteLength) return fail();
    const start = offset; offset += size; return start;
  };
  const u8 = () => view.getUint8(take(1));
  const u16 = () => view.getUint16(take(2));
  const i32 = () => view.getInt32(take(4));
  const remember = <T extends JavaValue>(value: T): T => { handles.push(value); return value; };
  const utf = (length: number): string => {
    const end = take(length) + length;
    let pos = end - length;
    let result = '';
    while (pos < end) {
      const a = view.getUint8(pos++);
      if (a > 0 && a < 128) result += String.fromCharCode(a);
      else if ((a & 0xe0) === 0xc0) {
        if (pos >= end) return fail();
        const b = view.getUint8(pos++);
        if ((b & 0xc0) !== 0x80) return fail();
        const code = ((a & 31) << 6) | (b & 63);
        if (code !== 0 && code < 128) return fail();
        result += String.fromCharCode(code);
      } else if ((a & 0xf0) === 0xe0) {
        if (pos + 1 >= end) return fail();
        const b = view.getUint8(pos++); const c = view.getUint8(pos++);
        if ((b & 0xc0) !== 0x80 || (c & 0xc0) !== 0x80) return fail();
        const code = ((a & 15) << 12) | ((b & 63) << 6) | (c & 63);
        if (code < 2048) return fail();
        result += String.fromCharCode(code);
      } else return fail();
    }
    return result;
  };
  const primitive = (type: string): JavaValue => {
    switch (type) {
      case 'B': return view.getInt8(take(1));
      case 'Z': { const value = u8(); if (value > 1) return fail(); return value === 1; }
      case 'C': return String.fromCharCode(u16());
      case 'S': return view.getInt16(take(2));
      case 'I': return i32();
      case 'J': return view.getBigInt64(take(8));
      case 'F': return view.getFloat32(take(4));
      case 'D': return view.getFloat64(take(8));
      default: return fail();
    }
  };
  const descriptor = (depth: number): Descriptor | null => {
    const value = read(depth + 1);
    if (value === null) return null;
    if (typeof value !== 'object' || !('kind' in value) || value.kind !== 'descriptor') return fail();
    return value;
  };
  const annotations = (depth: number): JavaValue[] => {
    const values: JavaValue[] = [];
    while (offset < view.byteLength && view.getUint8(offset) !== 0x78) values.push(read(depth + 1));
    if (u8() !== 0x78) return fail();
    return values;
  };
  const read = (depth: number): JavaValue => {
    if (depth > 64 || ++tokens > 250000) return fail();
    switch (u8()) {
      case 0x70: return null;
      case 0x71: {
        const index = i32() - 0x7e0000;
        if (index < 0 || index >= handles.length) return fail();
        return handles[index];
      }
      case 0x74: return remember(utf(u16()));
      case 0x7c: {
        const length = view.getBigUint64(take(8));
        if (length > BigInt(view.byteLength)) return fail();
        return remember(utf(Number(length)));
      }
      case 0x72: {
        const name = utf(u16()); take(8);
        const desc = remember<Descriptor>({ kind: 'descriptor', name, flags: u8(), fields: [], parent: null });
        const count = u16();
        if (count > 256) return fail();
        for (let i = 0; i < count; i++) {
          const type = String.fromCharCode(u8()); const fieldName = utf(u16());
          if (!'BCDFIJSZL['.includes(type)) return fail();
          if (type === 'L' || type === '[') { if (typeof read(depth + 1) !== 'string') return fail(); }
          desc.fields.push({ type, name: fieldName });
        }
        annotations(depth);
        desc.parent = descriptor(depth);
        return desc;
      }
      case 0x73: {
        const desc = descriptor(depth);
        if (!desc) return fail();
        const value = remember<JavaObject>({ kind: 'object', className: desc.name, fields: new Map(), annotations: new Map() });
        const hierarchy: Descriptor[] = [];
        for (let current: Descriptor | null = desc; current; current = current.parent) {
          if (hierarchy.includes(current) || hierarchy.length > 32) return fail();
          hierarchy.unshift(current);
        }
        for (const current of hierarchy) {
          if (current.flags !== 2 && current.flags !== 3) return fail();
          for (const field of current.fields) {
            value.fields.set(field.name, field.type === 'L' || field.type === '[' ? read(depth + 1) : primitive(field.type));
          }
          if (current.flags & 1) value.annotations.set(current.name, annotations(depth));
        }
        return value;
      }
      case 0x75: {
        const desc = descriptor(depth);
        if (!desc || !desc.name.startsWith('[')) return fail();
        const array = remember<JavaValue[]>([]);
        const length = i32();
        if (length < 0 || length > 100000) return fail();
        const type = desc.name[1];
        for (let i = 0; i < length; i++) array.push(type === 'L' || type === '[' ? read(depth + 1) : primitive(type));
        return array;
      }
      case 0x77: { const length = u8(); return new Uint8Array(buffer, take(length), length); }
      case 0x7a: { const length = i32(); return new Uint8Array(buffer, take(length), length); }
      default: return fail();
    }
  };
  if (u16() !== 0xaced || u16() !== 5) throw new Error('No es un archivo Holyrics compatible');
  const result = read(0);
  if (offset !== buffer.byteLength) return fail();
  return result;
}
