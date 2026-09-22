/**
 * Client-side utility for calling the server-side AI proxy.
 * This avoids direct SDK usage in the browser, preventing CORS and CSP errors.
 */
export const callAIProxy = async (contents: any[], config: any = {}, model: string = "gemini-3.8-flash", retries = 2): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout for server retries

    const response = await fetch('/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, contents, config }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    
    if (!response.ok) {
      if (isJson) {
        const data = await response.json();
        const errorMessage = data.error || "";
        
        // Comprehensive Quota error handling (429 or specific strings)
        const isQuotaError = 
          response.status === 429 || 
          errorMessage.toLowerCase().includes("quota") || 
          errorMessage.toLowerCase().includes("limit") || 
          errorMessage.toLowerCase().includes("resource_exhausted");

        if (isQuotaError) {
          throw new Error("O limite diário de uso da IA foi atingido para este projeto. A funcionalidade será restabelecida automaticamente em algumas horas.");
        }
        throw new Error(errorMessage || `Erro de IA (${response.status})`);
      } else {
        const text = await response.text();
        if (text.includes("<!doctype") || text.includes("<html") || text.includes("Service Unavailable")) {
          throw new Error("O serviço de IA está temporariamente ocupado. A operação está sendo processada, por favor aguarde e tente novamente em instantes.");
        }
        throw new Error(`Erro no servidor (${response.status}): ${text.substring(0, 100)}`);
      }
    }

    if (!isJson) {
      const text = await response.text();
      if (text.includes("<!doctype") || text.includes("<html")) {
        throw new Error("Resposta inesperada do servidor. O serviço pode estar instável, tente novamente.");
      }
      return text;
    }

    const data = await response.json();
    return data.text || "";
  } catch (error: any) {
    // Only log true unexpected errors, not user-friendly quota/timeout messages
    const isFriendlyError = 
      error.message?.includes("limite diário") || 
      error.message?.includes("temporariamente ocupado") ||
      error.name === 'AbortError';

    if (!isFriendlyError) {
      console.error("AI Proxy Error Context:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    } else {
      console.warn("AI Proxy Managed Error:", error.message);
    }

    if (error.name === 'AbortError') {
      throw new Error("O processamento excedeu o tempo limite. Tente enviar arquivos menores ou aguarde alguns minutos.");
    }

    const isNetworkError = error?.message?.includes('Failed to fetch') || error?.name === 'TypeError';
    
    if (isNetworkError && retries > 0) {
      console.warn(`Erro de conexão na IA. Tentando novamente... (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return callAIProxy(contents, config, model, retries - 1);
    }
    
    throw error;
  }
};
