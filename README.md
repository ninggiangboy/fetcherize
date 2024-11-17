# Fetcherize

A powerful and flexible HTTP client for TypeScript/JavaScript applications, built on top of the Fetch API with additional features like request/response interceptors, automatic retries, timeout handling, and type safety.

## Features

- 🚀 Built on the native Fetch API
- 🔄 Automatic request retrying with exponential backoff
- ⏱️ Request timeout support
- 🎯 Request and response interceptors
- 📝 TypeScript support with generics
- 🔌 Configurable base URL and default settings
- 📦 FormData handling
- 🛠️ Customizable headers and configurations

## Installation

```bash
npm install fetcherize
```

## Quick Start

```typescript
import { HttpClient } from "fetcherize";

// Create a new instance
const client = new HttpClient("https://api.example.com", {
  timeout: 5000,
  retries: 3,
  retryDelay: 1000,
});

// Make requests
try {
  const response = await client.get<User>("/users/1");
  console.log(response.data); // Type-safe user data
} catch (error) {
  console.error("Request failed:", error);
}
```

## API Reference

### Creating an Instance

```typescript
const client = new HttpClient(baseURL?: string, config?: HttpClientConfig);
```

Configuration options:

```typescript
interface HttpClientConfig {
  retries?: number; // Number of retry attempts (default: 1)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
  timeout?: number; // Request timeout in ms (default: 10000)
  headers?: Record<string, string>; // Default headers
}
```

### Making Requests

The client provides method shortcuts for common HTTP methods:

```typescript
// GET request
const response = await client.get<T>(url, config?);

// POST request
const response = await client.post<T>(url, data?, config?);

// PUT request
const response = await client.put<T>(url, data?, config?);

// PATCH request
const response = await client.patch<T>(url, data?, config?);

// DELETE request
const response = await client.delete<T>(url, config?);
```

### Request Configuration

```typescript
interface RequestConfig extends RequestInit {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  retries?: number;
  retryDelay?: number;
}
```

### Response Structure

```typescript
interface HttpResponse<T = unknown> {
  data: T; // Response data
  status: number; // HTTP status code
  headers: Headers; // Response headers
  config: RequestConfig; // Request configuration
}
```

### Interceptors

Add request interceptors:

```typescript
const removeInterceptor = client.addRequestInterceptor(async (config) => {
  // Modify config before request
  config.headers = {
    ...config.headers,
    Authorization: "Bearer token",
  };
  return config;
});
```

Add response interceptors:

```typescript
const removeInterceptor = client.addResponseInterceptor(async (response) => {
  // Process response before returning
  console.log("Response received:", response.status);
  return response;
});
```

### Error Handling

The client throws `HttpError` for failed requests:

```typescript
try {
  const response = await client.get("/api/data");
} catch (error) {
  if (error instanceof HttpError) {
    console.error("Status:", error.response?.status);
    console.error("Message:", error.message);
    console.error("Config:", error.config);
  }
}
```

### FormData Support

The client automatically handles FormData:

```typescript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("name", "example");

const response = await client.post("/upload", formData);
```

## Advanced Usage

### Custom Instance Configuration

```typescript
const client = new HttpClient("https://api.example.com", {
  timeout: 5000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    Accept: "application/json",
    "X-Custom-Header": "value",
  },
});
```

### Type-Safe Requests

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const response = await client.get<User>("/user/1");
// response.data is typed as User
console.log(response.data.name);
```

### Using Interceptors for Authentication

```typescript
client.addRequestInterceptor(async (config) => {
  const token = await getAuthToken();
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  };
  return config;
});

client.addResponseInterceptor(async (response) => {
  if (response.status === 401) {
    // Handle token refresh
    await refreshToken();
    // Retry the request
    return client.request(response.config);
  }
  return response;
});
```
