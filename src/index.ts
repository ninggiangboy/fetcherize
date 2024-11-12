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

type RequestInterceptor = (
  config: RequestConfig
) => Promise<RequestConfig> | RequestConfig;
type ResponseInterceptor = (
  response: HttpResponse
) => Promise<HttpResponse> | HttpResponse;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

class HttpError extends Error {
  constructor(
    public message: string,
    public response?: HttpResponse,
    public config?: RequestConfig
  ) {
    super(message);
    this.name = "HttpError";
  }
}

class HttpClient {
  private readonly baseURL: string;
  private readonly config: Required<HttpClientConfig>;
  private readonly requestInterceptors: RequestInterceptor[];
  private readonly responseInterceptors: ResponseInterceptor[];

  constructor(baseURL: string = "", config: HttpClientConfig = {}) {
    this.baseURL = baseURL;
    this.config = {
      retries: 1,
      retryDelay: 1000,
      timeout: 10000,
      headers: {},
      ...config,
    };

    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  public addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) this.requestInterceptors.splice(index, 1);
    };
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) this.responseInterceptors.splice(index, 1);
    };
  }

  private async applyRequestInterceptors(
    config: RequestConfig
  ): Promise<RequestConfig> {
    let interceptedConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      interceptedConfig = await interceptor(interceptedConfig);
    }
    return interceptedConfig;
  }

  private async applyResponseInterceptors(
    response: HttpResponse
  ): Promise<HttpResponse> {
    let interceptedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      interceptedResponse = await interceptor(interceptedResponse);
    }
    return interceptedResponse;
  }

  private processFormData(data: FormData): FormData {
    const formData = new FormData();
    for (const [key, value] of data.entries()) {
      if (value instanceof Blob) {
        formData.append(key, value, (value as File).name);
      } else {
        formData.append(key, value);
      }
    }
    return formData;
  }

  private createRequestConfig(
    method: HttpMethod,
    data?: unknown,
    customConfig: Partial<RequestConfig> = {}
  ): RequestConfig {
    const config: RequestConfig = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
        ...customConfig.headers,
      },
      ...customConfig,
    };

    if (data == undefined || ["GET", "HEAD"].includes(method)) {
      return config;
    }

    if (data instanceof FormData) {
      delete config.headers?.["Content-Type"];
      config.body = this.processFormData(data);
    } else if (data !== undefined) {
      config.body = JSON.stringify(data);
    }

    return config;
  }

  private async retryRequest(
    url: string,
    config: RequestConfig
  ): Promise<Response> {
    const retries = config.retries ?? this.config.retries;
    const retryDelay = config.retryDelay ?? this.config.retryDelay;
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, config);
        if (!response.ok) {
          throw new HttpError(
            `HTTP error! status: ${response.status}`,
            await this.createHttpResponse(response, config)
          );
        }
        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  private async createHttpResponse(
    response: Response,
    config: RequestConfig
  ): Promise<HttpResponse> {
    return {
      data: await response.json(),
      status: response.status,
      headers: response.headers,
      config,
    };
  }

  public async request<T>(
    url: string,
    method: HttpMethod,
    data?: unknown,
    customConfig: Partial<RequestConfig> = {}
  ): Promise<HttpResponse<T>> {
    const fullUrl = `${this.baseURL}${url}`;
    let config = this.createRequestConfig(method, data, customConfig);

    config = await this.applyRequestInterceptors(config);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout);
      config.signal = controller.signal;

      const response = await this.retryRequest(fullUrl, config);
      clearTimeout(timeout);

      const httpResponse = await this.createHttpResponse(response, config);
      return (await this.applyResponseInterceptors(
        httpResponse
      )) as HttpResponse<T>;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new HttpError("Request timeout", undefined, config);
      }
      throw error;
    }
  }

  // HTTP method shortcuts with generic type support
  public async get<T>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, "GET", null, config);
  }

  public async post<T>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, "POST", data, config);
  }

  public async put<T>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, "PUT", data, config);
  }

  public async patch<T>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, "PATCH", data, config);
  }

  public async delete<T>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, "DELETE", null, config);
  }
}

export { HttpClient, HttpError };
