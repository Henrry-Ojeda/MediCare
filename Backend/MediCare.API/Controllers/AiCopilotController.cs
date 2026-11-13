using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public sealed class AiCopilotController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public AiCopilotController(IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public sealed record ProcessConsultationRequest(
        string Transcript,
        string? PatientName,
        string? PatientAge,
        decimal? WeightKg,
        string? Specialty
    );

    [HttpPost("process-consultation")]
    public async Task<IActionResult> ProcessConsultation([FromBody] ProcessConsultationRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Transcript))
            return BadRequest(new { error = "Se requiere la transcripción o dictado clínico." });

        var apiKey = _config["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "MY_GEMINI_API_KEY")
        {
            return StatusCode(503, new
            {
                error = "GEMINI_API_KEY_NOT_CONFIGURED",
                message = "API key de Gemini no configurada en el entorno; utilizando motor clínico estructurado local."
            });
        }

        var model = _config["Gemini:Model"] ?? "gemini-3.8-flash";
        var prompt = $"""
            Actúa como un Copiloto Médico Clínico experto en {req.Specialty ?? "Medicina Ambulatoria"}.
            Paciente: {req.PatientName ?? "Paciente"} | Edad: {req.PatientAge ?? "N/E"} | Peso: {req.WeightKg ?? 15} kg
            Dictado del médico: "{req.Transcript}"
            Devuelve exclusivamente JSON válido con: motivoConsulta, examenFisico (general, cabezaCuello, cardiopulmonar, abdomen, extremidades), cie10Code, cie10Name, medicamentos (nombre, presentacion, dosisPorToma, frecuenciaHoras, duracionDias, indicacionEspecial), guiaPadres, signosAlarma (lista de 4 strings).
            """;

        var payload = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig = new { responseMimeType = "application/json" }
        };

        var client = _httpClientFactory.CreateClient();
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await client.PostAsync(endpoint, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            return StatusCode((int)response.StatusCode, new { error = "AI_PROCESSING_ERROR", message = errBody });
        }

        var raw = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(raw);
        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        return Ok(new { source = model, data = JsonDocument.Parse(text).RootElement });
    }
}

