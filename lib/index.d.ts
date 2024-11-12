interface HttpClientConfig {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
    headers?: Record<string, string>;
}
interface RequestConfig extends RequestInit {
    headers?: Record<string, string>;
    timeout?: number;
    signal?: AbortSignal;
    retries?: number;
    retryDelay?: number;
}
interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    headers: Headers;
    config: RequestConfig;
}
type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
type ResponseInterceptor = (response: HttpResponse) => Promise<HttpResponse> | HttpResponse;
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
declare class HttpError extends Error {
    message: string;
    response?: HttpResponse | undefined;
    config?: RequestConfig | undefined;
    constructor(message: string, response?: HttpResponse | undefined, config?: RequestConfig | undefined);
}
declare class HttpClient {
    private readonly baseURL;
    private readonly config;
    private readonly requestInterceptors;
    private readonly responseInterceptors;
    constructor(baseURL?: string, config?: HttpClientConfig);
    addRequestInterceptor(interceptor: RequestInterceptor): () => void;
    addResponseInterceptor(interceptor: ResponseInterceptor): () => void;
    private applyRequestInterceptors;
    private applyResponseInterceptors;
    private processFormData;
    private createRequestConfig;
    private retryRequest;
    private createHttpResponse;
    request<T>(url: string, method: HttpMethod, data?: unknown, customConfig?: Partial<RequestConfig>): Promise<HttpResponse<T>>;
    get<T>(url: string, config?: Partial<RequestConfig>): Promise<HttpResponse<T>>;
    post<T>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<HttpResponse<T>>;
    put<T>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<HttpResponse<T>>;
    patch<T>(url: string, data?: unknown, config?: Partial<RequestConfig>): Promise<HttpResponse<T>>;
    delete<T>(url: string, config?: Partial<RequestConfig>): Promise<HttpResponse<T>>;
}
export { HttpClient, HttpError };
