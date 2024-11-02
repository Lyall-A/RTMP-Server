const amf = require("./amf");
const rtmp = require("./rtmp");

// Example connect message: 02, 00, 07, 63, 6f, 6e, 6e, 65, 63, 74, 00, 3f, f0, 00, 00, 00, 00, 00, 00, 03, 00, 03, 61, 70, 70, 02, 00, 00, 00, 04, 74, 79, 70, 65, 02, 00, 0a, 6e, 6f, 6e, 70, 72, 69, 76, 61, 74, 65, 00, 08, 66, 6c, 61, 73, 68, 56, 65, 72, 02, 00, 1f, 46, 4d, 4c, 45, 2f, 33, 2e, 30, 20, 28, 63, 6f, 6d, 70, 61, 74, 69, 62, 6c, 65, 3b, 20, 46, 4d, 53, 63, 2f, 31, 2e, 30, 29, 00, 06, 73, 77, 66, 55, 72, 6c, 02, 00, 10, 72, 74, 6d, 70, 3a, 2f, 2f, 6c, 6f, 63, 61, 6c, 68, 6f, 73, 74, 00, 05, 74, 63, 55, 72, 6c, 02, 00, 10, 72, 74, 6d, 70, 3a, 2f, 2f, 6c, 6f, 63, 61, 6c, 68, 6f, 73, 74, 00, 00, 09
// Example connect message with header: 03, 00, 00, 00, 00, 00, 93, 14, 00, 00, 00, 00, 02, 00, 07, 63, 6f, 6e, 6e, 65, 63, 74, 00, 3f, f0, 00, 00, 00, 00, 00, 00, 03, 00, 03, 61, 70, 70, 02, 00, 00, 00, 04, 74, 79, 70, 65, 02, 00, 0a, 6e, 6f, 6e, 70, 72, 69, 76, 61, 74, 65, 00, 08, 66, 6c, 61, 73, 68, 56, 65, 72, 02, 00, 1f, 46, 4d, 4c, 45, 2f, 33, 2e, 30, 20, 28, 63, 6f, 6d, 70, 61, 74, 69, 62, 6c, 65, 3b, 20, 46, 4d, 53, 63, 2f, 31, 2e, 30, 29, 00, 06, 73, 77, 66, 55, 72, 6c, 02, 00, 10, 72, 74, 6d, 70, 3a, 2f, 2f, 6c, 6f, 63, 61, 6c, 68, 6f, 73, 74, 00, 05, 74, 63, 55, 72, 6c, 02, 00, 10, 72, 74, 6d, 70, 3a, 2f, 2f, 6c, 6f, 63, 61, 6c, 68, 6f, 73, 74, 00, 00, 09

const encoded = new amf.AMF0Encode([
    { type: 0x02, value: "connect" },
    { type: 0x00, value: 1.0 },
    { type: 0x03, value: {
        app: { type: 0x02, value: "" },
        type: { type: 0x02, value: "nonprivate" },
        flashVer: { type: 0x02, value: "FMLE/3.0 (compatible; FMSc/1.0)" },
        swfUrl: { type: 0x02, value: "rtmp://localhost" },
        tcUrl: { type: 0x02, value: "rtmp://localhost" }
    }}
]);

console.log(Array.from(encoded).map(i => i.toString(16).padStart(2, "0")).join(", "));

const decoded = new amf.AMF0Decode(encoded);

console.log(decoded);

const encodedChunk = rtmp.encodeChunk(20, encoded);

console.log((Array.from(encodedChunk).map(i => i.toString(16).padStart(2, "0")).join(", ")));