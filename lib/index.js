"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = exports.HttpClient = void 0;
class HttpError extends Error {
    constructor(message, response, config) {
        super(message);
        this.message = message;
        this.response = response;
        this.config = config;
        this.name = "HttpError";
    }
}
exports.HttpError = HttpError;
class HttpClient {
    constructor(baseURL = "", config = {}) {
        this.baseURL = baseURL;
        this.config = Object.assign({ retries: 1, retryDelay: 1000, timeout: 10000, headers: {} }, config);
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
        return () => {
            const index = this.requestInterceptors.indexOf(interceptor);
            if (index !== -1)
                this.requestInterceptors.splice(index, 1);
        };
    }
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
        return () => {
            const index = this.responseInterceptors.indexOf(interceptor);
            if (index !== -1)
                this.responseInterceptors.splice(index, 1);
        };
    }
    applyRequestInterceptors(config) {
        return __awaiter(this, void 0, void 0, function* () {
            let interceptedConfig = Object.assign({}, config);
            for (const interceptor of this.requestInterceptors) {
                interceptedConfig = yield interceptor(interceptedConfig);
            }
            return interceptedConfig;
        });
    }
    applyResponseInterceptors(response) {
        return __awaiter(this, void 0, void 0, function* () {
            let interceptedResponse = response;
            for (const interceptor of this.responseInterceptors) {
                interceptedResponse = yield interceptor(interceptedResponse);
            }
            return interceptedResponse;
        });
    }
    processFormData(data) {
        const formData = new FormData();
        for (const [key, value] of data.entries()) {
            if (value instanceof Blob) {
                formData.append(key, value, value.name);
            }
            else {
                formData.append(key, value);
            }
        }
        return formData;
    }
    createRequestConfig(method, data, customConfig = {}) {
        var _a;
        const config = Object.assign({ method, headers: Object.assign(Object.assign({ "Content-Type": "application/json" }, this.config.headers), customConfig.headers) }, customConfig);
        if (data == undefined || ["GET", "HEAD"].includes(method)) {
            return config;
        }
        if (data instanceof FormData) {
            (_a = config.headers) === null || _a === void 0 ? true : delete _a["Content-Type"];
            config.body = this.processFormData(data);
        }
        else if (data !== undefined) {
            config.body = JSON.stringify(data);
        }
        return config;
    }
    retryRequest(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const retries = (_a = config.retries) !== null && _a !== void 0 ? _a : this.config.retries;
            const retryDelay = (_b = config.retryDelay) !== null && _b !== void 0 ? _b : this.config.retryDelay;
            let lastError;
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    const response = yield fetch(url, config);
                    if (!response.ok) {
                        throw new HttpError(`HTTP error! status: ${response.status}`, yield this.createHttpResponse(response, config));
                    }
                    return response;
                }
                catch (error) {
                    lastError = error;
                    if (attempt < retries - 1) {
                        yield new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
                    }
                }
            }
            throw lastError;
        });
    }
    createHttpResponse(response, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                data: yield response.json(),
                status: response.status,
                headers: response.headers,
                config,
            };
        });
    }
    request(url_1, method_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (url, method, data, customConfig = {}) {
            const fullUrl = `${this.baseURL}${url}`;
            let config = this.createRequestConfig(method, data, customConfig);
            config = yield this.applyRequestInterceptors(config);
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.config.timeout);
                config.signal = controller.signal;
                const response = yield this.retryRequest(fullUrl, config);
                clearTimeout(timeout);
                const httpResponse = yield this.createHttpResponse(response, config);
                return (yield this.applyResponseInterceptors(httpResponse));
            }
            catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    throw new HttpError("Request timeout", undefined, config);
                }
                throw error;
            }
        });
    }
    // HTTP method shortcuts with generic type support
    get(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(url, "GET", null, config);
        });
    }
    post(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(url, "POST", data, config);
        });
    }
    put(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(url, "PUT", data, config);
        });
    }
    patch(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(url, "PATCH", data, config);
        });
    }
    delete(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(url, "DELETE", null, config);
        });
    }
}
exports.HttpClient = HttpClient;
