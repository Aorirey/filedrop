export type ConnectionStatus =
  | "idle"
  | "waiting"
  | "signaling"
  | "connected"
  | "failed"
  | "ended";

export type ReceivedFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  blob: Blob;
  url: string;
};

export type TransferProgress = {
  id: string;
  name: string;
  size: number;
  sent: number;
  status: "pending" | "sending" | "done" | "error";
};

type FileMetaMessage = {
  type: "file-meta";
  id: string;
  name: string;
  size: number;
  mime: string;
};

type FileDoneMessage = {
  type: "file-done";
  id: string;
};

type ControlMessage = FileMetaMessage | FileDoneMessage;

type SignalPayload =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const CHUNK_SIZE = 64 * 1024;

function encodeChunk(fileId: string, offset: number, data: ArrayBuffer): ArrayBuffer {
  const idBytes = new TextEncoder().encode(fileId);
  const header = new ArrayBuffer(2 + idBytes.length + 4);
  const view = new DataView(header);
  view.setUint16(0, idBytes.length);
  new Uint8Array(header, 2, idBytes.length).set(idBytes);
  view.setUint32(2 + idBytes.length, offset);

  const out = new Uint8Array(header.byteLength + data.byteLength);
  out.set(new Uint8Array(header), 0);
  out.set(new Uint8Array(data), header.byteLength);
  return out.buffer;
}

function decodeChunk(buffer: ArrayBuffer): {
  fileId: string;
  offset: number;
  data: ArrayBuffer;
} {
  const view = new DataView(buffer);
  const idLen = view.getUint16(0);
  const fileId = new TextDecoder().decode(new Uint8Array(buffer, 2, idLen));
  const offset = view.getUint32(2 + idLen);
  const data = buffer.slice(2 + idLen + 4);
  return { fileId, offset, data };
}

export type PeerCallbacks = {
  onStatus?: (status: ConnectionStatus) => void;
  onFileReceived?: (file: ReceivedFile) => void;
  onReceiveProgress?: (id: string, received: number, total: number) => void;
  onSendProgress?: (progress: TransferProgress) => void;
  onError?: (message: string) => void;
};

export class FileDropPeer {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private role: "receiver" | "sender";
  private roomId: string;
  private sendSignal: (data: SignalPayload) => void;
  private callbacks: PeerCallbacks;
  private incoming = new Map<
    string,
    { meta: FileMetaMessage; chunks: Map<number, ArrayBuffer>; received: number }
  >();
  private makingOffer = false;
  private disposed = false;

  constructor(
    role: "receiver" | "sender",
    roomId: string,
    sendSignal: (data: SignalPayload) => void,
    callbacks: PeerCallbacks = {}
  ) {
    this.role = role;
    this.roomId = roomId;
    this.sendSignal = sendSignal;
    this.callbacks = callbacks;
  }

  private setStatus(status: ConnectionStatus) {
    this.callbacks.onStatus?.(status);
  }

  private ensurePeer() {
    if (this.pc) return this.pc;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ type: "ice", candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") this.setStatus("connected");
      if (state === "failed") {
        this.setStatus("failed");
        this.callbacks.onError?.(
          "Не удалось установить P2P-соединение. Попробуйте в одной сети или позже (нужен TURN)."
        );
      }
      if (state === "disconnected" || state === "closed") {
        if (!this.disposed) this.setStatus("ended");
      }
    };

    pc.ondatachannel = (event) => {
      this.bindChannel(event.channel);
    };

    return pc;
  }

  private bindChannel(channel: RTCDataChannel) {
    this.channel = channel;
    channel.binaryType = "arraybuffer";

    channel.onopen = () => {
      this.setStatus("connected");
    };

    channel.onclose = () => {
      if (!this.disposed) this.setStatus("ended");
    };

    channel.onerror = () => {
      this.callbacks.onError?.("Ошибка канала передачи");
    };

    channel.onmessage = (event) => {
      void this.handleMessage(event.data);
    };
  }

  async startAsReceiver() {
    this.setStatus("signaling");
    const pc = this.ensurePeer();
    const channel = pc.createDataChannel("filedrop", { ordered: true });
    this.bindChannel(channel);

    this.makingOffer = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendSignal({ type: "offer", sdp: offer });
    } finally {
      this.makingOffer = false;
    }
  }

  async handleSignal(data: SignalPayload) {
    const pc = this.ensurePeer();

    if (data.type === "offer") {
      this.setStatus("signaling");
      await pc.setRemoteDescription(data.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.sendSignal({ type: "answer", sdp: answer });
      return;
    }

    if (data.type === "answer") {
      if (this.makingOffer) return;
      await pc.setRemoteDescription(data.sdp);
      return;
    }

    if (data.type === "ice" && data.candidate) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch {
        // ignore late/failed ICE
      }
    }
  }

  private async handleMessage(data: unknown) {
    if (typeof data === "string") {
      const msg = JSON.parse(data) as ControlMessage;
      if (msg.type === "file-meta") {
        this.incoming.set(msg.id, {
          meta: msg,
          chunks: new Map(),
          received: 0,
        });
        this.callbacks.onReceiveProgress?.(msg.id, 0, msg.size);
        return;
      }
      if (msg.type === "file-done") {
        const entry = this.incoming.get(msg.id);
        if (!entry) return;
        const ordered: ArrayBuffer[] = [];
        const offsets = [...entry.chunks.keys()].sort((a, b) => a - b);
        for (const offset of offsets) {
          ordered.push(entry.chunks.get(offset)!);
        }
        const blob = new Blob(ordered, {
          type: entry.meta.mime || "application/octet-stream",
        });
        const url = URL.createObjectURL(blob);
        this.incoming.delete(msg.id);
        this.callbacks.onFileReceived?.({
          id: entry.meta.id,
          name: entry.meta.name,
          size: entry.meta.size,
          mime: entry.meta.mime,
          blob,
          url,
        });
      }
      return;
    }

    if (data instanceof ArrayBuffer) {
      const { fileId, offset, data: chunk } = decodeChunk(data);
      const entry = this.incoming.get(fileId);
      if (!entry) return;
      entry.chunks.set(offset, chunk);
      entry.received += chunk.byteLength;
      this.callbacks.onReceiveProgress?.(
        fileId,
        entry.received,
        entry.meta.size
      );
    }
  }

  private async waitForChannelOpen(): Promise<RTCDataChannel> {
    if (this.channel?.readyState === "open") return this.channel;

    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (this.channel?.readyState === "open") {
          clearInterval(timer);
          resolve(this.channel);
        } else if (Date.now() - started > 30000) {
          clearInterval(timer);
          reject(new Error("Канал передачи не открылся"));
        }
      }, 50);
    });
  }

  private async sendRaw(channel: RTCDataChannel, data: string | ArrayBuffer) {
    while (channel.bufferedAmount > 1_000_000) {
      await new Promise((r) => setTimeout(r, 20));
    }
    if (typeof data === "string") {
      channel.send(data);
    } else {
      channel.send(data);
    }
  }

  async sendFiles(files: File[]) {
    const channel = await this.waitForChannelOpen();

    for (const file of files) {
      const id = crypto.randomUUID();
      const progress: TransferProgress = {
        id,
        name: file.name,
        size: file.size,
        sent: 0,
        status: "sending",
      };
      this.callbacks.onSendProgress?.(progress);

      const meta: FileMetaMessage = {
        type: "file-meta",
        id,
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
      };
      await this.sendRaw(channel, JSON.stringify(meta));

      let offset = 0;
      while (offset < file.size) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();
        await this.sendRaw(channel, encodeChunk(id, offset, buffer));
        offset += buffer.byteLength;
        progress.sent = offset;
        this.callbacks.onSendProgress?.({ ...progress });
      }

      const done: FileDoneMessage = { type: "file-done", id };
      await this.sendRaw(channel, JSON.stringify(done));
      progress.status = "done";
      progress.sent = file.size;
      this.callbacks.onSendProgress?.({ ...progress });
    }
  }

  dispose() {
    this.disposed = true;
    try {
      this.channel?.close();
    } catch {
      /* noop */
    }
    try {
      this.pc?.close();
    } catch {
      /* noop */
    }
    this.channel = null;
    this.pc = null;
  }

  getRoomId() {
    return this.roomId;
  }
}
