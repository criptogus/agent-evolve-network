// Browser-only progress, committed before each explicitly bounded provider request.
async function journalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sas-semantic-index-evidence", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("journals");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Evidence database unavailable"));
    request.onblocked = () => reject(new Error("Evidence database blocked"));
  });
}

export async function readIndexJournal(key: string): Promise<string | null> {
  const db = await journalDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("journals", "readonly").objectStore("journals").get(key);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
      request.onerror = () => reject(new Error("Evidence read failed"));
    });
  } finally {
    db.close();
  }
}

export async function writeIndexJournal(key: string, text: string): Promise<void> {
  const db = await journalDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("journals", "readwrite", { durability: "strict" });
      transaction.objectStore("journals").put(text, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Evidence write failed; stop without retry"));
      transaction.onabort = () => reject(new Error("Evidence write aborted; stop without retry"));
    });
  } finally {
    db.close();
  }
}
