export async function readAuthoredBody(request: Request, maxBytes = 210000): Promise<string> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("body_too_large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty_body");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0,
    text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("body_too_large");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
