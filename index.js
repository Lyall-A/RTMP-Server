const net = require("net");

const amf = require("./amf");
const rtmp = require("./rtmp");

const server = net.createServer();

server.on("connection", async socket => {
    log(`Connection from ${socket.remoteAddress}`);

    let chunkSize = 128;

    await rtmp.handshake(socket);
    log("Handshake complete");

    socket.on("data", data => {
        // log(`Received data: ${data.toString()} (${Array.from(data).map(i => i.toString(16).toUpperCase()).join(", ")})`);
       
        const { basicHeader, messageHeader, extendedTimestamp, chunkData } = rtmp.decodeChunk(data);

        log(`Got message header - timestamp: ${messageHeader.timestamp}, length: ${messageHeader.messageLength}, type ID: ${messageHeader.messageTypeId}, stream ID: ${messageHeader.messageStreamId}`)

        if (messageHeader.messageTypeId == 1) {
            // Set Chunk Size: https://rtmp.veriskope.com/docs/spec/#541set-chunk-size-1
            const oldChunkSize = chunkSize;
            chunkSize = chunkData.map((value, index) => index == 0 ? value & 0b01111111 : value).readUInt32BE(); // 31 bits??? what the sigma
            log(`Changed chunk size from ${oldChunkSize} to ${chunkSize}`);
        }

        if (messageHeader.messageTypeId == 20) {
            const { commandName, transactionId, commandObject, optionalUserArguments } = rtmp.decodeCommandMessage(chunkData);
            log(`Received command message '${commandName}':`);
            console.log(commandObject);

            if (commandName == "connect") {
                console.log(`Client connecting to '${commandObject.tcUrl}'`);
            }

            // TODO: reply with shit, ima need to make a function to make these message chunk things. fucking effort
        }
    });
});

server.listen(1935, () => log("RTMP server running at :1935"));

function log(...msgs) {
    // console.log(...msgs);
    console.log(`[${new Date().toUTCString()}]`, ...msgs);
}