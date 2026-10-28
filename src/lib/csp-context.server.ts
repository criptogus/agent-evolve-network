import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();
export const withCspNonce = <T>(nonce: string, run: () => T): T => storage.run(nonce, run);
export const requestCspNonce = () => storage.getStore();
