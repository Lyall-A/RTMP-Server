function buffer(length, func) {
    const buffer = Buffer.alloc(length);
    func?.(buffer);
    return buffer;
}

module.exports = {
    buffer
}