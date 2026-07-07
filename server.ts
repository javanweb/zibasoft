import express from "express";
import path from "path";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, LiveServerMessage, StartSensitivity, EndSensitivity } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // API Routes
  app.post("/api/gemini/businessAdvice", async (req, res) => {
    try {
      const { query } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
          systemInstruction:
            "شما یک مشاور زیبایی هوشمند، بسیار با تجربه و محترم برای سالن زیبایی تخصصی زیباسافت هستید. به زبان فارسی بسیار روان، مودبانه و گرم صحبت می‌کنید. شما تخصص کاملی در زمینه مشاوره پوست و مو، استایل مو، میکاپ، کاشت ناخن، روتین‌های مراقبتی و ترکیب رنگ مو دارید. پاسخ‌های شما باید کاربردی، دقیق، علمی و الهام‌بخش باشد و لحنی صمیمانه اما حرفه‌ای داشته باشد. در پاسخ‌های خود از شکلک‌های مناسب زیبایی مانند ✨💅💇‍♀️🌸 نیز استفاده کنید.",
        },
      });
      res.json({ text: response.text || "متاسفانه پاسخی دریافت نشد." });
    } catch (error) {
      console.error("Thinking API Error full:", error);
      if (error?.status === 503 || error?.message?.includes("high demand")) {
        res.status(503).json({ error: "سرور در حال حاضر ترافیک بالایی دارد. لطفاً چند دقیقه دیگر دوباره تلاش کنید." });
      } else {
        res.status(500).json({ error: "خطایی در دریافت مشاوره هوشمند رخ داد." });
      }
    }
  });

  app.post("/api/gemini/searchLocations", async (req, res) => {
    try {
      const { query, userLat, userLng } = req.body;
      const config: any = {
        tools: [{ googleMaps: {} }],
      };

      if (userLat && userLng) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLat,
              longitude: userLng,
            },
          },
        };
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: config,
      });

      const text = response.text || "";
      const links: { title: string; uri: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            links.push({ title: chunk.web.title, uri: chunk.web.uri });
          }
          if (chunk.maps?.uri && chunk.maps?.title) {
            links.push({ title: chunk.maps.title, uri: chunk.maps.uri });
          }
        });
      }

      res.json({ text, links });
    } catch (error) {
      console.error("Maps API Error:", error);
      if (error?.status === 503 || error?.message?.includes("high demand")) {
        res.status(503).json({ error: "ترافیک سرور بالاست. لطفاً کمی بعد تلاش کنید.", links: [] });
      } else {
        res.status(500).json({ error: "خطا در برقراری ارتباط با نقشه گوگل.", links: [] });
      }
    }
  });

  app.post("/api/gemini/editImageStyle", async (req, res) => {
    try {
      const { base64Image, mimeType, prompt } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let imageUrl = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      res.json({ imageUrl });
    } catch (error) {
      console.error("Image Edit Error:", error);
      if (error?.status === 503 || error?.message?.includes("high demand")) {
        res.status(503).json({ error: "سرور موقتاً شلوغ است. لطفاً دوباره تلاش کنید." });
      } else {
        res.status(500).json({ error: "خطا در ویرایش تصویر." });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = createServer(app);

  // WebSocket Server for Live API
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/live")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction:
            "شما منشی و دستیار صوتی بسیار سریع و صمیمی سالن زیبایی تخصصی زیباسافت هستید. " +
            "پاسخ‌های شما باید فوق‌العاده کوتاه، صوتی، محاوره‌ای و بسیار سریع باشد (حداکثر ۳ تا ۵ کلمه در هر نوبت). " +
            "هرگز توضیحات طولانی ندهید، حاشیه نروید، فقط در حد یک پاسخ کوتاه چندکلمه‌ای جواب دهید تا سرعت مکالمه و پاسخ‌دهی به بالاترین حد ممکن برسد. حتماً به زبان فارسی محاوره‌ای و صمیمی صحبت کنید.",
          realtimeInputConfig: {
            automaticActivityDetection: {
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
              silenceDurationMs: 200,
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
            },
          },
        },
        callbacks: {
          onopen: () => console.log("Gemini Live: Open"),
          onclose: (e) => {
            console.log("Gemini Live: Close", e);
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.close();
            }
          },
          onerror: (e: any) => {
            console.error("Gemini Live: Error", e.message || e.error || e);
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ error: e.message || "خطا در ارتباط با هوش مصنوعی" }));
              clientWs.close();
            }
          },
          onmessage: (message: LiveServerMessage) => {
            console.log("Gemini Live message:", Object.keys(message.serverContent || {}));
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && clientWs.readyState === clientWs.OPEN) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
              }
            }
            if (message.serverContent?.interrupted) {
              if (clientWs.readyState === clientWs.OPEN) {
                clientWs.send(JSON.stringify({ interrupted: true }));
              }
            }
          },
        },
      });

      console.log("Gemini Live: Connected");
      
      session.sendClientContent({ 
        turns: [{ role: "user", parts: [{ text: "سلام! خیلی کوتاه به سالن زیباسافت خوش‌آمد بگو و بگو چطور می‌تونی کمک کنی." }] }],
        turnComplete: true
      });

      clientWs.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      });

      clientWs.on("close", () => {
        console.log("Client WS closed, closing Gemini Live session...");
        try {
          session.close();
        } catch (err) {
          console.error("Error closing Gemini session:", err);
        }
      });
    } catch (e: any) {
      console.error("WebSocket connection error:", e);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ error: e.message || "خطا در اتصال به هوش مصنوعی" }));
      }
      clientWs.close();
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
