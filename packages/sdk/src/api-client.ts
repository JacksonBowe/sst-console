import axios, { type AxiosError, type AxiosInstance } from "axios";

import type { Session } from "@console/functions/src/api/schemas/auth.schemas";

import { type AuthMethods, authMethods } from "./auth";
import { type ConsoleMethods, consoleMethods } from "./console";
import { toApiError } from "./errors";
import type { SdkInternalRequestConfig, SdkRequestConfig } from "./request";

export type AccessTokenProvider = () =>
	| Promise<string | undefined>
	| string
	| undefined;
export type RefreshHandler = () => Promise<Session>;
export type AuthFailureHandler = () => Promise<void> | void;

export type ClientOptions = {
	baseUrl: string;
	getAccessToken?: AccessTokenProvider;
	refreshSession?: RefreshHandler;
	onAuthFailure?: AuthFailureHandler;
};

export type ApiClient = {
	axios: AxiosInstance;
	request: <T>(config: SdkRequestConfig) => Promise<T>;
} & AuthMethods &
	ConsoleMethods;

export function createClient({
	baseUrl,
	getAccessToken,
	refreshSession,
	onAuthFailure
}: ClientOptions): ApiClient {
	const instance = axios.create({ baseURL: baseUrl });

	instance.interceptors.request.use(
		async config => {
			const token = await getAccessToken?.();
			if (token) config.headers.Authorization = `Bearer ${token}`;
			return config;
		},
		error => Promise.reject(toApiError(error))
	);

	instance.interceptors.response.use(
		response => response,
		async (error: AxiosError) => {
			const config = error.config as SdkInternalRequestConfig | undefined;
			const isUnauthorized = error.response?.status === 401;

			if (isUnauthorized && config?._noRetry) {
				await onAuthFailure?.();
				throw toApiError(error);
			}

			if (isUnauthorized && config && refreshSession && !config._retry) {
				config._retry = true;
				try {
					const session = await refreshSession();
					config.headers.Authorization = `Bearer ${session.accessToken}`;
					return instance.request(config);
				} catch (refreshError) {
					await onAuthFailure?.();
					throw toApiError(refreshError);
				}
			}

			if (isUnauthorized && config?._retry) await onAuthFailure?.();
			throw toApiError(error);
		}
	);

	const request = async <T>(config: SdkRequestConfig): Promise<T> => {
		const response = await instance.request<T>(config);
		return response.data;
	};

	return {
		axios: instance,
		request,
		...authMethods(request),
		...consoleMethods(request)
	};
}
