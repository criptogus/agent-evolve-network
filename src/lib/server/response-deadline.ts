// Header/handler deadline. Long operations must return their response stream
// promptly; this guard remains in place for every incoming request.
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "__timeout__"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<"__timeout__">((resolve) => {
        timer = setTimeout(() => resolve("__timeout__"), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
