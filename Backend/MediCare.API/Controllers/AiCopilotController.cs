using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using MediCare.API.Services;
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
    private readonly DbConnectionFactory _db;

    public AiCopilotController(IConfiguration config, IHttpClientFactory httpClientFactory, DbConnectionFactory db)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
        _db = db;
    }

    public sealed record ProcessConsultationRequest(
        string Transcript,
        string? PatientName,
        string? PatientAge,
        decimal? WeightKg,
        string? Specialty,
        string? ApiKey,
        string? Model
    );

    public sealed record AnalyzeRecipeImageRequest(
        string ImageDataUrl,
        string? ApiKey,
        string? Model
    );

    public sealed record TestConnectionRequest(
        string? ApiKey,
        string? Model
    );

    private string? ResolveApiKey(string? requestApiKey)
    {
        var key = !string.IsNullOrWhiteSpace(requestApiKey)
            ? requestApiKey.Trim()
            : (_config["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY"));
        if (string.IsNullOrWhiteSpace(key) || key == "MY_GEMINI_API_KEY")
            return null;
        return key;
    }

    private string ResolveModel(string? requestModel)
    {
        var candidate = !string.IsNullOrWhiteSpace(requestModel)
            ? requestModel.Trim()
            : (_config["Gemini:Model"] ?? "gemini-2.5-flash");
        return candidate == "gemini-3.8-flash" ? "gemini-2.5-flash" : candidate;
    }

    [HttpPost("test-connection")]
    public async Task<IActionResult> TestConnection([FromBody] TestConnectionRequest req, CancellationToken ct)
    {
        var apiKey = ResolveApiKey(req.ApiKey);
        if (apiKey is null)
        {
            return BadRequest(new { error = "GEMINI_API_KEY_NOT_CONFIGURED", message = "Ingresa una API Key de Gemini válida." });
        }

        var model = ResolveModel(req.Model);
        var payload = new
        {
            contents = new[] { new { parts = new[] { new { text = "Responde únicamente con la palabra OK." } } } }
        };

        var client = _httpClientFactory.CreateClient();
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await client.PostAsync(endpoint, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            return StatusCode((int)response.StatusCode, new { error = "AI_CONNECTION_ERROR", message = errBody });
        }

        return Ok(new { ok = true, model, message = $"Conexión exitosa con {model}." });
    }

    [HttpPost("process-consultation")]
    public async Task<IActionResult> ProcessConsultation([FromBody] ProcessConsultationRequest req, CancellationToken ct)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var isAdmin = role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase)
            || role.Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin && Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
        {
            await using var conn = await _db.CreateOpenConnectionAsync(ct);
            var enabled = await conn.QueryFirstOrDefaultAsync<bool?>(
                """
                IF COL_LENGTH('dbo.TB_USUARIOS', 'DictationEnabled') IS NOT NULL
                    SELECT ISNULL(DictationEnabled, 0) FROM dbo.TB_USUARIOS WHERE Id = @Id
                ELSE
                    SELECT CAST(0 AS BIT)
                """,
                new { Id = uid }
            );
            if (enabled != true)
            {
                return StatusCode(403, new
                {
                    error = "DICTATION_NOT_ENABLED",
                    message = "El Dictado Clínico Inteligente no está habilitado en el plan de este médico."
                });
            }
        }

        if (string.IsNullOrWhiteSpace(req.Transcript))
            return BadRequest(new { error = "Se requiere la transcripción o dictado clínico." });

        var apiKey = ResolveApiKey(req.ApiKey);
        if (apiKey is null)
        {
            return StatusCode(503, new
            {
                error = "GEMINI_API_KEY_NOT_CONFIGURED",
                message = "API key de Gemini no configurada en el Módulo IA ni en el servidor."
            });
        }

        var model = ResolveModel(req.Model);
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

    [HttpPost("analyze-recipe-image")]
    public async Task<IActionResult> AnalyzeRecipeImage([FromBody] AnalyzeRecipeImageRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.ImageDataUrl))
            return BadRequest(new { error = "Se requiere la imagen del récipe." });

        var apiKey = ResolveApiKey(req.ApiKey);
        if (apiKey is null)
        {
            return StatusCode(503, new
            {
                error = "GEMINI_API_KEY_NOT_CONFIGURED",
                message = "Configura tu API Key de Gemini en el Módulo IA para analizar la imagen automáticamente."
            });
        }

        var match = Regex.Match(req.ImageDataUrl, @"^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$", RegexOptions.Singleline);
        if (!match.Success)
            return BadRequest(new { error = "Formato de imagen inválido (se esperaba Data URL base64)." });

        var mimeType = match.Groups[1].Value;
        var base64Data = match.Groups[2].Value;
        var model = ResolveModel(req.Model);

        const string prompt = """
            Analiza la imagen de este récipe médico y extrae su configuración visual para replicarlo en un sistema clínico.
            Devuelve exclusivamente JSON válido con estas claves:
            - clinicName (string: nombre de la clínica o del médico en el encabezado, si aparece)
            - clinicSubtitle (string: especialidad o subtítulo)
            - rif (string: RIF o registro profesional si aparece, o cadena vacía)
            - address (string: dirección o teléfono si aparece, o cadena vacía)
            - footerNote (string: nota al pie si aparece, o cadena vacía)
            - orientation ("vertical" o "horizontal" según la proporción de la hoja)
            - borderColor (elige el más cercano entre "#0284C7", "#059669", "#7C3AED", "#0F172A")
            - hideDefaultHeaderOnBg (boolean: true si la imagen ya trae un membrete gráfico impreso que debe respetarse)
            """;

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new { inline_data = new { mime_type = mimeType, data = base64Data } }
                    }
                }
            },
            generationConfig = new { responseMimeType = "application/json" }
        };

        var client = _httpClientFactory.CreateClient();
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await client.PostAsync(endpoint, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            return StatusCode((int)response.StatusCode, new { error = "AI_VISION_ERROR", message = errBody });
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
