class AMF0Decode {
    constructor(buffer, offset = 0) {
        const decodedBuffer = [];

        while (offset < buffer.byteLength) {
            const type = buffer[offset++];
            let decoded;
    
            if (type == 0x00) {
                decoded = AMF0Decode.decodeNumber(buffer, offset);
            } else
            if (type == 0x02) {
                decoded = AMF0Decode.decodeString(buffer, offset);
            } else
            if (type == 0x03) {
                decoded = AMF0Decode.decodeObject(buffer, offset);
            } else throw new Error(`Type '0x${type.toString(16).padStart(2, "0")}' not recognised`);
    
            decodedBuffer.push(decoded.value);
            offset = decoded.offset;
        }

        return decodedBuffer;
    }
    
    static decodeNumber(buffer, offset = 0) {
        const number = buffer.readDoubleBE(offset);
        offset += 8;
        return { value: number, offset };
    }
    static decodeString(buffer, offset = 0) {
        const length = buffer.readUInt16BE(offset);
        offset += 2;
        const string = buffer.subarray(offset, offset += length).toString();
        return { value: string, offset, length };
    }
    static decodeObject(buffer, offset = 0) {
        let reachedEnd = false;
        const object = { };
        while (!reachedEnd) {
            const decodedKey = this.decodeString(buffer, offset);
            const key = decodedKey.value;
            offset = decodedKey.offset;

            const valueType = buffer[offset++];
            let decodedValue;

            if (valueType == 0x00) {
                decodedValue = this.decodeNumber(buffer, offset);
            } else
            if (valueType == 0x02) {
                decodedValue = this.decodeString(buffer, offset);
            } else
            if (valueType == 0x03) {
                decodedValue = this.decodeObject(buffer, offset);
            } else throw new Error(`Type '0x${valueType.toString(16).padStart(2, "0")}' not recognised`);
            const value = decodedValue.value;

            offset = decodedValue.offset;
            object[key] = value;

            if (buffer[offset + 0] == 0x00 &&
                buffer[offset + 1] == 0x00 &&
                buffer[offset + 2] == 0x09) reachedEnd = true;
        }
        offset += 3;
        return { value: object, offset };
    }
}

class AMF0Encode {
    constructor(object) {
        const encodedBufferArray = [];

        for (const { type, value } of object) {
            let encoded;

            if (type == 0x00) {
                encoded = AMF0Encode.encodeNumber(value);
            } else
            if (type == 0x02) {
                encoded = AMF0Encode.encodeString(value);
            } else
            if (type == 0x03) {
                encoded = AMF0Encode.encodeObject(value);
            } else throw new Error(`Type 0x${type.toString(16).padStart(2, "0")} not recognised`);

            encodedBufferArray.push(Buffer.concat([Buffer.from([type]), encoded]));
        }

        const encodedBuffer = Buffer.concat(encodedBufferArray);
        return encodedBuffer;
    }

    static encodeNumber(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeDoubleBE(value);
        return buffer;
    }
    static encodeString(value) {
        const length = Buffer.byteLength(value);
        const buffer = Buffer.alloc(2 + length);
        let offset = 0;
        buffer.writeUInt16BE(length, offset);
        offset += 2;
        buffer.write(value, offset);
        return buffer;
    }
    static encodeObject(value) {
        const bufferArray = [];
        for (const [ fieldKey, valueObject ] of Object.entries(value)) {
            const key = AMF0Encode.encodeString(fieldKey);

            const valueType = valueObject.type;
            let value;

            if (valueType == 0x00) {
                value = this.encodeNumber(valueObject.value);
            } else
            if (valueType == 0x02) {
                value = this.encodeString(valueObject.value);
            } else
            if (valueType == 0x03) {
                value = this.encodeObject(valueObject.value);
            } else throw new Error(`Type '0x${valueType.toString(16).padStart(2, "0")}' not recognised`);

            bufferArray.push(Buffer.concat([key, Buffer.from([valueType]), value]));
        }
        bufferArray.push(Buffer.from([0x00, 0x00, 0x09]));
        const buffer = Buffer.concat(bufferArray);
        return buffer;
    }
}

module.exports = {
    AMF0Decode,
    AMF0Encode
}