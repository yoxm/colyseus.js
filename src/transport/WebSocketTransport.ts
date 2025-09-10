import { ITransport, ITransportEventMap } from "./ITransport";

// 使用 uniwebsocket 替代原生 WebSocket
// 这里假设 uniwebsocket 已经通过某种方式可用
// 在实际使用中，可能需要通过 import 或全局变量来获取
declare const uni: any;

export class WebSocketTransport implements ITransport {
    private ws: any; // uniwebsocket 实例
    private protocols?: string | string[];

    constructor(public events: ITransportEventMap) {}

    public send(data: Buffer | Uint8Array): void {
        if (this.ws && this.isOpen) {
            let sendData: any;
            // 处理不同类型的数据
            if (data instanceof ArrayBuffer) {
                // 如果已经是 ArrayBuffer，直接使用
                sendData = data;
            } else if (data.buffer instanceof ArrayBuffer) {
                // 如果是 TypedArray (如 Uint8Array)，需要正确提取 ArrayBuffer
                const typedArray = data;
                sendData = typedArray.buffer.slice(
                    typedArray.byteOffset,
                    typedArray.byteOffset + typedArray.byteLength
                );
            } else if (typeof data === "string") {
                // 如果是字符串，直接使用
                sendData = data;
            } else {
                // 其他类型转换为字符串
                sendData = String(data);
            }
            this.ws.send({
                data: data,
                success: () => {
                    // 发送成功
                },
                fail: (error: any) => {
                    console.error("WebSocket send failed:", error);
                    if (this.events.onerror) {
                        this.events.onerror(error);
                    }
                },
            });
        }
    }

    public sendUnreliable(data: ArrayBuffer | Array<number>): void {
        console.warn(
            "colyseus.js: The WebSocket transport does not support unreliable messages"
        );
    }

    /**
     * @param url URL to connect to
     * @param options 连接选项，包括 headers 等
     */
    public connect(url: string, options: any = {}): void {
        try {
            // 使用 uni.connectSocket 创建 WebSocket 连接
            this.ws = uni.connectSocket({
                url: url,
                protocols: this.protocols,
                header: options.headers || {},
                success: () => {
                    console.log("WebSocket connection initiated");
                },
                fail: (error: any) => {
                    console.error("WebSocket connection failed:", error);
                    if (this.events.onerror) {
                        this.events.onerror(error);
                    }
                },
            });

            // 监听 WebSocket 事件
            this.ws.onOpen((res: any) => {
                console.log("WebSocket connected");
                if (this.events.onopen) {
                    this.events.onopen(res);
                }
            });

            this.ws.onMessage((res: any) => {
                if (this.events.onmessage) {
                    // 处理接收到的数据
                    const event = {
                        data: res.data,
                        type: "message",
                    };
                    this.events.onmessage(event);
                }
            });

            this.ws.onClose((res: any) => {
                console.log("WebSocket closed:", res);
                if (this.events.onclose) {
                    this.events.onclose(res);
                }
            });

            this.ws.onError((error: any) => {
                console.error("WebSocket error:", error);
                if (this.events.onerror) {
                    this.events.onerror(error);
                }
            });
        } catch (e) {
            console.error("Failed to create WebSocket connection:", e);
            if (this.events.onerror) {
                this.events.onerror(e);
            }
        }
    }

    public close(code?: number, reason?: string): void {
        if (this.ws) {
            this.ws.close({
                code: code || 1000,
                reason: reason || "Normal closure",
                success: () => {
                    console.log("WebSocket closed successfully");
                },
                fail: (error: any) => {
                    console.error("Failed to close WebSocket:", error);
                },
            });
        }
    }

    get isOpen(): boolean {
        return this.ws && this.ws.readyState === 1; // 1 表示 OPEN 状态
    }
}
