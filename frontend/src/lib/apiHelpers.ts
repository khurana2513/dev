// Helper function to safely read fetch response (can only read once!)
export async function readResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  
  if (!res.ok) {
    try {
      const error = JSON.parse(text);
      throw new Error(error.detail || error.message || `Request failed with status ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Request failed')) {
        throw e;
      }
      throw new Error(text || `Request failed with status ${res.status}`);
    }
  }
  
  if (!text) {
    throw new Error("Empty response from server");
  }
  
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}





