import { LocalStorage } from "quasar";

export function loadPersisted<T>(key: string): T | null {
	return (LocalStorage.getItem(key) as T | null) ?? null;
}

export function savePersisted<T>(key: string, value: T): void {
	LocalStorage.set(key, value);
}

export function clearPersisted(key: string): void {
	LocalStorage.remove(key);
}
