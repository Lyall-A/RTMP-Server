const net = require("net");

const amf = require("./amf");

const server = net.createServer();

server.on("connection", socket => {
    log(`Connection from ${socket.remoteAddress}`);
    let handshake = 0;

    let C0ProtocolVersion;
    let C1Timestamp;
    let C1RandomBytes;

    socket.on("data", data => {
        // log(`Received data: ${data.toString()} (${Array.from(data).map(i => i.toString(16).toUpperCase()).join(", ")})`);
        let nextPacket = data;
        let packet;

        // Handshake
        if (handshake == 0 && nextPacket.length >= 1) {
            // C0
            packet = nextPacket.subarray(0, 1);
            nextPacket = nextPacket.subarray(1);
            C0ProtocolVersion = packet;
            handshake = 1;
            log("Received C0");
        }
        if (handshake == 1 && nextPacket.length >= 1536) {
            // C1
            packet = nextPacket.subarray(0, 1536);
            nextPacket = nextPacket.subarray(1536);
            C1Timestamp = packet.subarray(0, 4);
            C1RandomBytes = packet.subarray(8);
            handshake = 2;
            log("Received C1, sending S0 and S1 (handshake done)");
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
        if (handshake == 2 && nextPacket.length >= 1536) {
            // C2
            packet = nextPacket.subarray(0, 1536);
            nextPacket = nextPacket.subarray(1536);
            log("Received C2, sending S2");
            handshake = true;
            return socket.write(Buffer.concat([
                Buffer.from(C1Timestamp), // Timestamp from C1
                buffer(4, i => i.writeUInt32BE(Math.floor(Date.now() / 1000))), // Timestamp
                C1RandomBytes // Random bytes from C1
            ]));
        }
    
        // Chunking
        packet = nextPacket;
        let offset = 0;

        // Basic Header
        const basicHeader = {
            type: packet[0] & 0b11000000,
            streamId:
                (packet[0] & 0b00111111) == 1 ? (packet[2] * 256) + packet[1] : // 3 bytes
                (packet[0] & 0b00111111) == 0 ? packet[1] + 64 : // 2 bytes
                packet[0] & 0b00111111 // 1 byte
        }
        offset++;

        // Message Header
        const messageHeader = {};

        if (basicHeader.type == 0) {
            messageHeader.timestamp = packet.subarray(offset, offset += 3).readUIntBE(0, 3);
            messageHeader.messageLength = packet.subarray(offset, offset += 3).readUIntBE(0, 3);
            messageHeader.messageTypeId = packet.subarray(offset, offset += 1)[0];
            messageHeader.messageStreamId = packet.subarray(offset, offset += 4).readUInt32LE(0);
        }

        // Extended Timestamp
        let extendedTimestamp;
        if (messageHeader.timestamp >= 0xFFFFFF) extendedTimestamp = packet.subarray(offset, offset += 4).readUInt32BE(0);
        
        // Chunk Data
        const chunkData = packet.subarray(offset);

        // Options
        let chunkSize = 128;

        log(`Got message header - timestamp: ${messageHeader.timestamp}, length: ${messageHeader.messageLength}, type ID: ${messageHeader.messageTypeId}, stream ID: ${messageHeader.messageStreamId}`)

        if (messageHeader.messageTypeId == 1) {
            // Set Chunk Size: https://rtmp.veriskope.com/docs/spec/#541set-chunk-size-1
            const oldChunkSize = chunkSize;
            chunkSize = chunkData.map((value, index) => index == 0 ? value & 0b01111111 : value).readUInt32BE(); // 31 bits??? what the sigma
            log(`Changed chunk size from ${oldChunkSize} to ${chunkSize}`);
        }

        if (messageHeader.messageTypeId == 20) {
            const [commandName, transactionId, commandObject, optionalUserArguments] = amf.AMF0.decodeBuffer(chunkData);
            log(`Received command message '${commandName}':`);
            console.log(commandObject);

            // TODO: reply with shit, ima need to make a function to make these message chunk things. fucking effort
        }
    });
});

server.listen(1935, () => log("RTMP server running at :1935"));

function buffer(length, func) {
    const buffer = Buffer.alloc(length);
    func?.(buffer);
    return buffer;
}

function log(...msgs) {
    // console.log(...msgs);
    console.log(`[${new Date().toUTCString()}]`, ...msgs);
}