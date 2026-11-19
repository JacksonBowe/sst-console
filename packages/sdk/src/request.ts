import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

export type SdkRequestConfig = AxiosRequestConfig & {
	_noRetry?: boolean;
	_public?: boolean;
};

export type SdkInternalRequestConfig = InternalAxiosRequestConfig & {
	_retry?: boolean;
	_noRetry?: boolean;
	_public?: boolean;
};

export type RequestFn = <T>(config: SdkRequestConfig) => Promise<T>;
