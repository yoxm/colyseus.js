import { Client } from "./Client";
import { AbortError, ServerError } from "./errors/Errors";

// 声明 uni 对象类型
declare const uni: any;

// 定义响应类型，模拟 httpie.Response
export interface UniResponse<T = any> {
    data: T;
    statusCode: number;
    header: { [key: string]: string };
    cookies: string[];
}

// 定义请求选项类型
export interface UniRequestOptions {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    header?: { [key: string]: string };
    timeout?: number;
    dataType?: string;
    responseType?: string;
    sslVerify?: boolean;
    withCredentials?: boolean;
}

export class HTTP {
    public authToken: string;

    constructor(
        protected client: Client,
        public headers: { [id: string]: string } = {},
    ) {}

    public get<T = any>(path: string, options: Partial<UniRequestOptions> = {}): Promise<UniResponse<T>> {
        return this.request("GET", path, options);
    }

    public post<T = any>(path: string, options: Partial<UniRequestOptions> = {}): Promise<UniResponse<T>> {
        return this.request("POST", path, options);
    }

    public del<T = any>(path: string, options: Partial<UniRequestOptions> = {}): Promise<UniResponse<T>> {
        return this.request("DELETE", path, options);
    }

    public put<T = any>(path: string, options: Partial<UniRequestOptions> = {}): Promise<UniResponse<T>> {
        return this.request("PUT", path, options);
    }

    protected request(method: "GET" | "POST" | "PUT" | "DELETE", path: string, options: Partial<UniRequestOptions> = {}): Promise<UniResponse> {
        return new Promise((resolve, reject) => {
            const requestOptions = this.getOptions(method, path, options);
            
            uni.request({
                ...requestOptions,
                success: (res: any) => {
                    // 检查状态码
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            data: res.data,
                            statusCode: res.statusCode,
                            header: res.header,
                            cookies: res.cookies || []
                        });
                    } else {
                        // 处理错误状态码
                        const message = res.data?.error || res.errMsg || `HTTP ${res.statusCode}`;
                        reject(new ServerError(res.statusCode, message));
                    }
                },
                fail: (error: any) => {
                    // 处理网络错误或其他失败情况
                    if (error.errMsg && error.errMsg.includes('abort')) {
                        reject(new AbortError("Request aborted"));
                    } else {
                        const message = error.errMsg || error.message || "Request failed";
                        reject(new ServerError(-1, message));
                    }
                }
            });
        });
    }

    protected getOptions(method: string, path: string, options: Partial<UniRequestOptions>): UniRequestOptions {
        // 合并默认自定义头部和用户头部
        const headers = Object.assign({}, this.headers, options.header);

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        // 构建完整的请求选项
        const requestOptions: UniRequestOptions = {
            url: this.client['getHttpEndpoint'](path),
            method: method as any,
            header: headers,
            timeout: options.timeout || 60000, // 默认60秒超时
            dataType: options.dataType || 'json',
            responseType: options.responseType || 'text',
            sslVerify: options.sslVerify !== false, // 默认启用SSL验证
            withCredentials: options.withCredentials !== false // 默认包含凭证
        };

        // 如果有数据，添加到请求中
        if (options.data !== undefined) {
            requestOptions.data = options.data;
        }

        return requestOptions;
    }
}
