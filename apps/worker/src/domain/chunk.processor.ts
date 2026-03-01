export async function processChunk(chunk: string) {
  let attempts = 0;

  while (attempts < 3) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
    }
  }
}