// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import protobufjs from "protobufjs";
import * as protobuf from 'protobufjs';

import { FileDescriptorSet } from "protobufjs/ext/descriptor";

import { protobufDefinitionsToDatatypes, stripLeadingDot } from "./protobufDefinitionsToDatatypes";
import { MessageDefinitionMap } from "./types";

/**
 * Parse a Protobuf binary schema (FileDescriptorSet) and produce datatypes and a deserializer
 * function.
 */
export function parseProtobufSchema(
  schemaName: string,
  schemaData: Uint8Array,
): {
  datatypes: MessageDefinitionMap;
  deserialize: (buffer: ArrayBufferView) => unknown;
} {
  const descriptorSet = FileDescriptorSet.decode(schemaData);

  const root = protobufjs.Root.fromDescriptor(descriptorSet);
  root.resolveAll();
  const rootType = root.lookupType(schemaName);

  // Modify the definition of google.protobuf.Timestamp and Duration so they are interpreted as
  // {sec: number, nsec: number}, compatible with the rest of Studio. The standard Protobuf types
  // use different names (`seconds` and `nanos`), and `seconds` is an `int64`, which would be
  // deserialized as a bigint by default.
  //
  // protobufDefinitionsToDatatypes also has matching logic to rename the fields.
  const fixTimeType = (
    type: protobufjs.ReflectionObject | null /* eslint-disable-line no-restricted-syntax */,
  ) => {
    if (!type || !(type instanceof protobufjs.Type)) {
      return;
    }
    type.setup(); // ensure the original optimized toObject has been created
    const prevToObject = type.toObject; // eslint-disable-line @typescript-eslint/unbound-method
    const newToObject: typeof prevToObject = (message, options) => {
      const result = prevToObject.call(type, message, options);
      const { seconds, nanos } = result as { seconds: bigint; nanos: number };
      if (typeof seconds !== "bigint" || typeof nanos !== "number") {
        return result;
      }
      if (seconds > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error(
          `Timestamps with seconds greater than 2^53-1 are not supported (found seconds=${seconds}, nanos=${nanos})`,
        );
      }
      return { sec: Number(seconds), nsec: nanos };
    };
    type.toObject = newToObject;
  };

  fixTimeType(root.lookup(".google.protobuf.Timestamp"));
  fixTimeType(root.lookup(".google.protobuf.Duration"));

  const deserialize = (data: ArrayBufferView) => {
    // console.log(
	    
    return rootType.toObject(populateNestedDefaults( 
      rootType, // 
      rootType.decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)),
      'MSG',
      new Set()), {defaults: true}); //  );

      /*
    return rootType.toObject(
      rootType.decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)),
      { defaults: true },
    );
   */
  };

  const datatypes: MessageDefinitionMap = new Map();
  protobufDefinitionsToDatatypes(datatypes, rootType);

  if (!datatypes.has(schemaName)) {
    throw new Error(
      `Protobuf schema does not contain an entry for '${schemaName}'. The schema name should be fully-qualified, e.g. '${stripLeadingDot(
        rootType.fullName,
      )}'.`,
    );
  }

  return { deserialize, datatypes };
}


function populateNestedDefaults(
    typeDescriptor: protobuf.Type,
    message: any,
    parent_name: string,
    visitedTypes: Set<string>
): any {

    if (visitedTypes.has(parent_name)){ 
        return message; // Avoid recursion on already visited types
    }

    for (const oneof of typeDescriptor.oneofsArray || []) {
        // Handle oneof fields
        let setMember: string | null = null;
        for (const fieldName of oneof.oneof) {
            if (message[fieldName] !== undefined && message[fieldName] !== null) {
                setMember = fieldName;
                break;
            }
        }
        if (setMember) {
            // Populate defaults for the set member if not already set
            const fieldDescriptor = typeDescriptor.fields[setMember];
            if (fieldDescriptor) {
                const fieldType = fieldDescriptor.resolve().resolvedType;
                if (fieldType instanceof protobuf.Type) {
                    message[setMember] = populateNestedDefaults(fieldType, message[setMember], `${parent_name}.${setMember}`, visitedTypes);
                }
            }
        } else if (oneof.oneof.length > 0) {
            // Default to the first member
            const firstMember = oneof.oneof[0];
            if (firstMember && typeDescriptor.fields[firstMember]) {
                const fieldDescriptor = typeDescriptor.fields[firstMember];
                if (fieldDescriptor) {
                    const fieldType = fieldDescriptor.resolve().resolvedType;
                    if (fieldType instanceof protobuf.Type) {
                        message[firstMember] = populateNestedDefaults(fieldType, {}, `${parent_name}.${firstMember}`, visitedTypes);
                }
            }
	    }}}

    for (const field of typeDescriptor.fieldsArray) {
        if (typeDescriptor.oneofs && Object.values(typeDescriptor.oneofs).some(o => o.oneof.includes(field.name))) {
            continue; // Skip oneof fields handled above
        }

        const fieldType = field.resolve().resolvedType;


        if (fieldType instanceof protobuf.Type) {
            // Field is a message type, recursively populate its defaults
            message[field.name] = populateNestedDefaults(fieldType, message?.[field.name]? message[field.name]: fieldType.create({}), `${parent_name}.${field.name}`, visitedTypes);
        } else {
            // Field is a primitive type, use the default value from the field descriptor
            
	    if (message[field.name] === undefined && message[field.name] === null) {
            	message[field.name] = field.defaultValue; 
	    }
	    console.log("MESSAGE:", message);
        }
    }
    visitedTypes.add(parent_name); 
    return message;
}
