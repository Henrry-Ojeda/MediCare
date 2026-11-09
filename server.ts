import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "2mb" }));

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
