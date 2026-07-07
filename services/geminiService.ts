// Proxy calls to the Express backend

export interface MapResult {
  title: string;
  uri: string;
}

// --- 1. Thinking Mode (Complex Business Advice) ---
export const getBusinessAdvice = async (query: string): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/businessAdvice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        throw new Error(data.error || "خطای سرور");
      } catch (e: any) {
        if (e.message !== "خطای سرور" && !e.message.includes("Unexpected token")) throw e;
        throw new Error("ارتباط با سرور برقرار نشد (ترافیک بالا یا قطعی شبکه).");
      }
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  } catch (error: any) {
    console.error("Thinking API Error:", error);
    throw new Error(error.message || "خطایی در دریافت مشاوره هوشمند رخ داد. لطفا مجدد تلاش کنید.");
  }
};

// --- 2. Maps Grounding (Supplier/Location Search) ---
export const searchLocations = async (query: string, userLat?: number, userLng?: number): Promise<{ text: string, links: MapResult[] }> => {
  try {
    const response = await fetch("/api/gemini/searchLocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, userLat, userLng })
    });
    
    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        throw new Error(data.error || "خطای سرور");
      } catch (e: any) {
        if (e.message !== "خطای سرور" && !e.message.includes("Unexpected token")) throw e;
        throw new Error("ارتباط با سرور برقرار نشد (ترافیک بالا).");
      }
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return { text: data.text, links: data.links };
  } catch (error: any) {
    console.error("Maps API Error:", error);
    throw new Error(error.message || "خطا در برقراری ارتباط با نقشه گوگل.");
  }
};

// --- 3. Image Editing (Nano Banana) ---
export const editImageStyle = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
  try {
    const response = await fetch("/api/gemini/editImageStyle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image, mimeType, prompt })
    });
    
    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        throw new Error(data.error || "خطای سرور");
      } catch (e: any) {
        if (e.message !== "خطای سرور" && !e.message.includes("Unexpected token")) throw e;
        throw new Error("ارتباط با سرور برقرار نشد (ترافیک بالا).");
      }
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.imageUrl;
  } catch (error: any) {
    console.error("Image Edit Error:", error);
    throw new Error(error.message || "خطا در ویرایش تصویر.");
  }
};

// --- 4. Live API (Voice Agent) Utils ---

export const connectLiveSession = async (
  onOpen: () => void,
  onMessage: (msg: any) => void,
  onError: (e: any) => void,
  onClose: (e: any) => void
) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
  
  ws.onopen = onOpen;
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.error) {
         onError(new Error(msg.error));
         return;
      }
      // Construct a fake LiveServerMessage object to keep LiveVoice.tsx compatible
      if (msg.audio) {
        onMessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: msg.audio } }] } } });
      }
      if (msg.interrupted) {
        onMessage({ serverContent: { interrupted: true } });
      }
    } catch (e) {
      console.error("Error parsing message", e);
    }
  };
  ws.onerror = onError;
  ws.onclose = onClose;
  
  // Return an adapter object so LiveVoice.tsx doesn't need to change much
  return {
    sendRealtimeInput: (input: { audio?: { data: string, mimeType: string }, media?: { data: string, mimeType: string } }) => {
      const data = input.audio?.data || input.media?.data;
      if (data && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ audio: data }));
      }
    },
    close: () => {
      ws.close();
    }
  };
};

// Helper to convert Float32 AudioBuffer to PCM Int16 Blob with built-in noise gating
export function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  
  // Calculate Root Mean Square (RMS) to determine volume
  let sum = 0;
  for (let i = 0; i < l; i++) {
    sum += data[i] * data[i];
  }
  const rms = Math.sqrt(sum / l);
  
  // If RMS is below 0.008 (background noise/hum), gate it to perfect silence
  // This guarantees the server's voice activity detection (VAD) triggers instantly
  const isSilence = rms < 0.008;
  
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = isSilence ? 0 : (data[i] * 32768);
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper to decode Base64 to AudioBuffer
export async function decodeAudioData(
  base64Data: string,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
