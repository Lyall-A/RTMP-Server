const { buffer } = require("./utils");
const amf = require("./amf");

function handshake(socket) {
    return new Promise((resolve, reject) => {
        let handshake = 0;
        let protocolVersion;
        let timestamp;
        let randomBytes;

        function dataCallback(data) {
            let offset = 0;

            if (handshake == 0 && data.length >= 1) {
                // C0
                protocolVersion = data[offset++];
                handshake = 1;
            }
            if (handshake == 1 && data.length - offset >= 1536) {
                // C1
                timestamp = data.subarray(offset, offset += 4);
                offset += 4;
                randomBytes = data.subarray(offset, offset += 1528);
                handshake = 2;
                return socket.write(Buffer.concat([
                    // S0
                    Buffer.from([0x03]),
                    // S1 // TODO: should just copy C1?
                    Buffer.concat([
                        buffer(4, i => i.writeUInt32BE(Math.floor(Date.now() / 1000))), // Timestamp
                        buffer(4), // Zeros
                        buffer(1528) // Random data // TODO: RANDOM data
                    ])
                ]));
            }
            if (handshake == 2 && data.length - offset >= 1536) {
                // C2
                handshake = true;
                socket.write(Buffer.concat([
                    Buffer.from(timestamp), // Timestamp from C1
                    buffer(4, i => i.writeUInt32BE(Math.floor(Date.now() / 1000))), // Timestamp
                    randomBytes // Random bytes from C1
                ]));
                socket.removeListener("close", dataCallback);
                resolve();
            }

        }

        socket.on("data",  dataCallback);
        
        setTimeout(() => {
            if (!handshake) reject("Handshake timed out");
        }, 5000);
    });
}

function decodeChunk(buffer, offset = 0) {
    const basicHeader = {
        type: buffer[offset] & 0b11000000,
        streamId:
            (buffer[offset] & 0b00111111) == 1 ? (buffer[offset += 2] * 256) + buffer[offset - 1] : // 3 bytes
                (buffer[offset] & 0b00111111) == 0 ? buffer[(offset += 2) - 1] + 64 : // 2 bytes
                    buffer[offset++] & 0b00111111 // 1 byte
    }

    const messageHeader = {};

    if (basicHeader.type == 0) {
        messageHeader.timestamp = buffer.readUIntBE(offset, (offset += 3) - offset + 3);
        messageHeader.messageLength = buffer.readUIntBE(offset, (offset += 3) - offset + 3);
        messageHeader.messageTypeId = buffer[offset++];
        messageHeader.messageStreamId = buffer.readUInt32LE((offset += 4) - 4);
    } else throw new Error(`Unimplemented type in chunk type '${basicHeader.type}'`);

    let extendedTimestamp;
    if (messageHeader.timestamp >= 0xFFFFFF) extendedTimestamp = buffer.readUInt32BE((offset += 4) - 4);

    const chunkData = buffer.subarray(offset, offset += messageHeader.messageLength);

    return {
        streamId: basicHeader.streamId,
        // TODO: timestamp, etc

        basicHeader,
        messageHeader,
        extendedTimestamp,
        chunkData
    }
}

function encodeChunk(messageType, data) {
    const streamId = 3;
    const format = 0;
    const messageStreamId = 0;
    const timestamp = 0;
    
    const basicHeader = Buffer.alloc(streamId <= 63 ? 1 : streamId <= 319 ? 2 : 3);
    basicHeader[0] = ((format & 0b11) << 6);
    if (streamId <= 63) {
        basicHeader[0] = ((format & 0b11) << 6) | (streamId & 0b00111111);
    } else
    if (streamId <= 319) {
        basicHeader[0] = ((format & 0b11) << 6);
        basicHeader.writeUInt8(streamId - 64, 1);
    } else {
        basicHeader[0] = ((format & 0b11) << 6) | 0b00000001;
        basicHeader.writeUInt16BE(streamId - 64, 1);
    }

    const messageHeader = Buffer.alloc(11); // type 0
    if (format == 0) {
        messageHeader.writeUIntBE(timestamp >= 0xFFFFFF ? 0xFFFFFF : timestamp, 0, 3); // Timestamp, unsure if this is epoch or what though
        messageHeader.writeUIntBE(Buffer.byteLength(data), 3, 3);
        messageHeader.writeUIntBE(messageType, 6, 1);
        messageHeader.writeUInt32BE(messageStreamId, 7);
    } else throw new Error(`Unknown format '${format}'`);

    const extendedTimestamp = Buffer.alloc(timestamp > 0xFFFFFF ? 4 : 0);
    if (timestamp >= 0xFFFFFF) extendedTimestamp.writeUInt32BE(timestamp);

    const buffer = Buffer.concat([basicHeader, messageHeader, extendedTimestamp, Buffer.from(data)]);
    return buffer;
}

function decodeCommandMessage(buffer, offset = 0) {
    const [commandName, transactionId, commandObject, optionalUserArguments] = new amf.AMF0Decode(buffer, offset);
    return {
        commandName,
        transactionId,
        commandObject,
        optionalUserArguments
    };
}

module.exports = {
    handshake,
    encodeChunk,
    decodeChunk,
    decodeCommandMessage
}