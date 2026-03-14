/**
 * Axios client configured for Tauri backend
 */

import axios, { AxiosHeaders } from "axios";
import { invoke } from "@tauri-apps/api/core";
import type { AuthSessionResponse, AuthUser } from "../types";

let apiClient: ReturnType<typeof axios.create> | null = null;
let backendBaseUrl: string | null = null;
let csrfToken: string | null = null;
let authFailureHandler: (() => void) | null = null;

const CSRF_COOKIE_NAMES = ["__Host-csrf", "workbench-csrf"];

function resolveLoopbackHost(): string {
  if (
    typeof window !== "undefined" &&
    /^https?:$/.test(window.location.protocol)
  ) {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return hostname;
    }
  }

  return "127.0.0.1";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const entry of cookies) {
    const [cookieName, ...rest] = entry.split("=");
    if (cookieName === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

function syncCsrfTokenFromCookies() {
  if (csrfToken) {
    return;
  }

  for (const cookieName of CSRF_COOKIE_NAMES) {
    const cookieValue = readCookie(cookieName);
    if (cookieValue) {
      csrfToken = cookieValue;
      return;
    }
  }
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function registerAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

export async function getBackendBaseUrl(): Promise<string> {
  if (backendBaseUrl) {
    return backendBaseUrl;
  }

  try {
    const port = await invoke<number>("get_backend_port");
    backendBaseUrl = `http://${resolveLoopbackHost()}:${port}`;
    return backendBaseUrl;
  } catch (error) {
    const viteBackendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
    if (viteBackendUrl) {
      backendBaseUrl = viteBackendUrl;
      return viteBackendUrl;
    }
    throw error;
  }
}

export async function buildBackendUrl(path: string) {
  const baseUrl = await getBackendBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Get or create the configured axios instance
 */
export async function getApiClient() {
  if (apiClient) {
    return apiClient;
  }

  const baseURL = await getBackendBaseUrl();

  apiClient = axios.create({
    baseURL,
    timeout: 60000, // 60 seconds for long operations
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  apiClient.interceptors.request.use((config) => {
    syncCsrfTokenFromCookies();

    const method = config.method?.toUpperCase() ?? "GET";
    if (csrfToken && !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
      if (config.headers && typeof config.headers.set === "function") {
        config.headers.set("X-CSRF-Token", csrfToken);
      } else {
        config.headers = AxiosHeaders.from({
          ...config.headers,
          "X-CSRF-Token": csrfToken,
        });
      }
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error?.response?.status === 401) {
        setCsrfToken(null);
        authFailureHandler?.();
      }
      return Promise.reject(error);
    },
  );

  return apiClient;
}

/**
 * Reset the client (useful for testing or reconnection)
 */
export function resetApiClient() {
  apiClient = null;
  backendBaseUrl = null;
  csrfToken = null;
}

export async function login(
  username: string,
  password: string,
): Promise<AuthUser> {
  const client = await getApiClient();
  const response = await client.post<AuthSessionResponse>("/auth/login", {
    username,
    password,
  });
  setCsrfToken(response.data.csrf_token);
  return response.data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  syncCsrfTokenFromCookies();
  const client = await getApiClient();
  try {
    const response = await client.get<AuthUser>("/auth/me");
    syncCsrfTokenFromCookies();
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  const client = await getApiClient();
  try {
    await client.post("/auth/logout");
  } finally {
    setCsrfToken(null);
  }
}
