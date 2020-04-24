# Streamless API

`wire-protocol` also supports an alternative API without streaming. This is optimized for the browser, making the bundle signficantly smaller and avoiding costly ArrayBuffer-to-Buffer conversions.

Everything is the same except how you connect `WireProtocol` objects.

Instead of:
```javascript
wire1.pipe(wire2).pipe(wire1)
```
Use:
```javascript
wire1.on('data', (data) => wire2.write(data))
wire2.on('data', (data) => wire1.write(data))
```

