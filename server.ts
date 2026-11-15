import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { checkDbHealth } from "./server/db.ts";
import clinicalRoutes from "./server/routes/clinicalRoutes.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3010;

  app.use(express.json({ limit: "2mb" }));

  // Healthcheck de servidor y conexión a SQL Server (BD_MEDICARE)
  app.get("/api/health", async (_req, res) => {
    const db = await checkDbHealth();
    res.status(db.connected ? 200 : 503).json({
      service: "MediCare API",
      db,
    });
  });

  app.get("/api/system/network-info", (_req, res) => {
    const nets = os.networkInterfaces();
    const addresses: string[] = [];
    for (const ifaceList of Object.values(nets)) {
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        if (iface.family === "IPv4" && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    const preferredIp =
      addresses.find((ip) => ip.startsWith("192.168.")) ||
      addresses.find((ip) => ip.startsWith("10.")) ||
      addresses[0] ||
      "localhost";
    const apkPath =
      [
        path.join(__dirname, "public", "downloads", "MediCare.apk"),
        path.join(__dirname, "android", "app", "build", "outputs", "apk", "release", "app-release.apk"),
        path.join(__dirname, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
      ].find((p) => fs.existsSync(p)) || "";
    const apkAvailable = Boolean(apkPath);
    const apkUpdatedAt = apkPath ? fs.statSync(apkPath).mtime.toISOString() : null;
    let apkVersionCode = 1;
    let apkVersionName = "1.0";
    try {
      const gradlePath = path.join(__dirname, "android", "app", "build.gradle");
      if (fs.existsSync(gradlePath)) {
        const gradleText = fs.readFileSync(gradlePath, "utf8");
        const codeMatch = gradleText.match(/versionCode\s+(\d+)/);
        const nameMatch = gradleText.match(/versionName\s+"([^"]+)"/);
        if (codeMatch) apkVersionCode = Number(codeMatch[1]);
        if (nameMatch) apkVersionName = nameMatch[1];
      }
    } catch {
      // ignore gradle parse errors
    }
    const publicOrigin = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
    const resolvedBaseUrl = publicOrigin || `http://${preferredIp}:${PORT}`;
    res.json({
      ip: preferredIp,
      port: PORT,
      url: resolvedBaseUrl,
      publicUrl: publicOrigin || null,
      apkAvailable,
      apkVersionCode,
      apkVersionName,
      apkUpdatedAt,
      downloadPageUrl: `${resolvedBaseUrl}/descargar`,
      apkUrl: `${resolvedBaseUrl}/downloads/MediCare.apk`,
      allIps: addresses,
    });
  });

  app.get("/descargar", (_req, res) => {
    const apkPath = [
      path.join(__dirname, "public", "downloads", "MediCare.apk"),
      path.join(__dirname, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
    ].find((p) => fs.existsSync(p));
    const sizeMb = apkPath ? (fs.statSync(apkPath).size / 1_000_000).toFixed(2) : null;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Descargar MediCare Android</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: #f1f5f9; color: #0f172a; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { width: 100%; max-width: 420px; background: #fff; border-radius: 24px; padding: 28px 22px; box-shadow: 0 20px 45px rgba(15,23,42,.08); border: 1px solid #e2e8f0; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; padding: 5px 12px; border-radius: 999px; margin-bottom: 12px; }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 800; }
    p.sub { margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.45; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 18px; border-radius: 14px; background: #059669; color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 8px 20px rgba(5,150,105,.25); }
    .btn.disabled { background: #94a3b8; pointer-events: none; box-shadow: none; }
    .steps { margin-top: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; font-size: 13px; color: #334155; }
    .steps strong { color: #0f172a; }
    .steps ol { margin: 8px 0 0; padding-left: 18px; line-height: 1.55; }
    .web-link { display: block; text-align: center; margin-top: 16px; font-size: 13px; color: #0284c7; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">App Nativa Android (.apk)</span>
    <h1>MediCare Pediatría</h1>
    <p class="sub">${apkPath ? `Paquete listo para instalar (${sizeMb} MB).` : "El APK aún no ha sido compilado en el servidor."}</p>
    <a class="btn ${apkPath ? "" : "disabled"}" href="/downloads/MediCare.apk">
      ⬇ Descargar e Instalar MediCare.apk
    </a>
    <div class="steps">
      <strong>Cómo instalar si no se abre solo:</strong>
      <ol>
        <li>Si la descarga llega al 100% y no abre el instalador, desliza la <strong>barra de notificaciones</strong> de tu teléfono y toca <strong>MediCare.apk</strong>.</li>
        <li>O abre <strong>Mis Archivos → Descargas</strong> y toca <strong>MediCare.apk</strong>.</li>
        <li>Si Android lo solicita, activa <strong>Permitir desde esta fuente</strong> e instala.</li>
      </ol>
    </div>
    <a class="web-link" href="/">Abrir versión Web en el navegador →</a>
  </div>
</body>
</html>`);
  });

  app.get("/downloads/MediCare.apk", (_req, res) => {
    const apkPath = [
      path.join(__dirname, "public", "downloads", "MediCare.apk"),
      path.join(__dirname, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
    ].find((p) => fs.existsSync(p));
    if (!apkPath) {
      return res.status(404).json({ error: "APK_NOT_BUILT", message: "El archivo MediCare.apk aún no ha sido compilado." });
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.download(apkPath, "MediCare.apk");
  });

  // Rutas REST de módulos clínicos (BD_MEDICARE)
  app.use("/api", clinicalRoutes);

  // Manejador central de errores API
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Error en API MediCare:", err);
    res.status(err?.status || 500).json({
      error: "API_ERROR",
      message: err?.message || "Error interno en el servidor.",
    });
  });

  // Server-side Gemini AI Endpoint for Active Consultation Copilot (Vista 16)
  app.post("/api/ai/process-consultation", async (req, res) => {
    try {
      const { transcript, patientName, patientAge, weightKg, specialty } = req.body;

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Se requiere la transcripción o dictado clínico." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(503).json({
          error: "GEMINI_API_KEY_NOT_CONFIGURED",
          message: "API key de Gemini no configurada en el entorno; utilizando motor clínico estructurado local.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `
Actúa como un Copiloto Médico Clínico experto en ${specialty || "Pediatría y Medicina Ambulatoria"}.
Analiza el siguiente dictado o conversación médica de la consulta:
Paciente: ${patientName || "Paciente"}
Edad: ${patientAge || "No especificada"}
Peso actual: ${weightKg || 15} kg
Dictado del médico: "${transcript}"

Estructura la historia clínica completa en español neutro y devuelve estrictamente el objeto JSON solicitado con:
- motivoConsulta: Resumen claro del motivo de consulta y evolución de la enfermedad actual.
- examenFisico: Hallazgos por áreas (general, cabezaCuello, cardiopulmonar, abdomen, extremidades).
- cie10Code: Código CIE-10 oficial más apropiado (ej. J03.9, J00, J21.9, A09, N39.0, I10, L20.9).
- cie10Name: Nombre oficial del diagnóstico CIE-10.
- medicamentos: Lista de medicamentos calculando la dosis exacta según el peso de ${weightKg || 15} kg si aplica.
- guiaPadres: Explicación empática, cálida y muy clara para los padres o el paciente sobre el diagnóstico, cuidados en casa y horarios.
- signosAlarma: Lista de 4 signos de alarma críticos por los cuales acudir de inmediato a urgencias.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "Eres un asistente médico clínico certificado. Devuelve siempre JSON válido y estructurado con terminología médica precisa en el examen físico y lenguaje empático en la guía para padres.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              motivoConsulta: { type: Type.STRING },
              examenFisico: {
                type: Type.OBJECT,
                properties: {
                  general: { type: Type.STRING },
                  cabezaCuello: { type: Type.STRING },
                  cardiopulmonar: { type: Type.STRING },
                  abdomen: { type: Type.STRING },
                  extremidades: { type: Type.STRING },
                },
              },
              cie10Code: { type: Type.STRING },
              cie10Name: { type: Type.STRING },
              medicamentos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nombre: { type: Type.STRING },
                    presentacion: { type: Type.STRING },
                    dosisPorToma: { type: Type.STRING },
                    frecuenciaHoras: { type: Type.STRING },
                    duracionDias: { type: Type.STRING },
                    indicacionEspecial: { type: Type.STRING },
                  },
                },
              },
              guiaPadres: { type: Type.STRING },
              signosAlarma: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const structuredData = JSON.parse(rawText);
      return res.json({ source: "gemini-3.8-flash", data: structuredData });
    } catch (error: any) {
      console.error("Error procesando consulta con Gemini:", error);
      return res.status(500).json({
        error: "AI_PROCESSING_ERROR",
        message: error?.message || "Error al estructurar la consulta con IA.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MedCore AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
