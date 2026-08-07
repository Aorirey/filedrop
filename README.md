# Filedrop

P2P file transfer between devices via QR code. Open the site on a computer (receiver), scan the QR from your phone (sender), pick files — they arrive over WebRTC DataChannel. The server only handles signaling.

## Stack

- Next.js (App Router) + custom Node server
- Socket.IO signaling rooms
- WebRTC P2P (STUN only in MVP)
- Glassmorphism UI

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Receiver: home page shows a QR code and room code
- Sender: scan QR or open `/s/ROOMCODE` / use Menu → enter code

## Production (Render)

1. Push this repo to GitHub/GitLab/Bitbucket
2. Create a Blueprint from `render.yaml`, or create a **Web Service** with:
   - Build: `npm ci && npm run build`
   - Start: `npm start`
   - Health check: `/api/health`
3. Bind uses `0.0.0.0:$PORT` automatically via the custom server

## Limits (MVP)

- No TURN server: some restrictive NATs may fail to connect
- Rooms die when the receiver disconnects
- Files are never stored on the server
