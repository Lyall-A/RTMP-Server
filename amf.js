class AMF0 {
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
            const decodedValue = this.decodeString(buffer, offset + 1);
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
    static decodeBuffer(buffer, offset = 0) {
        const decodedBuffer = [];

        while (offset < buffer.byteLength) {
            const type = buffer[offset++];
            let decoded;
    
            if (type == 0x00) {
                decoded = AMF0.decodeNumber(buffer, offset);
            } else
            if (type == 0x02) {
                decoded = AMF0.decodeString(buffer, offset);
            } else
            if (type == 0x03) {
                decoded = AMF0.decodeObject(buffer, offset);
            } else throw new Error(`Type 0x${type.toString(16).padStart(2, "0")} not recognised`);
    
            decodedBuffer.push(decoded.value);
            offset = decoded.offset;
        }

        return decodedBuffer;
    }
}

module.exports = {
    AMF0
}