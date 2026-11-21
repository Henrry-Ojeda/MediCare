using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class NotificationsController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    public NotificationsController(DbConnectionFactory db) => _db = db;

    public sealed record CreateNotificationRequest(
        string Title,
        string Message,
        string Category,
        string? Priority,
        List<string> TargetRoles,
        string? PatientId,
        string? AppointmentId,
        string? TargetUserId = null
    );

    private static async Task EnsureTargetUserColumnAsync(System.Data.Common.DbConnection conn, CancellationToken ct)
    {
        await conn.ExecuteAsync(
            new CommandDefinition(
                "IF COL_LENGTH('dbo.TB_NOTIFICACIONES', 'TargetUserId') IS NULL ALTER TABLE dbo.TB_NOTIFICACIONES ADD TargetUserId NVARCHAR(100) NULL;",
                cancellationToken: ct
            )
        );
    }

    public sealed record CallAssistantRequest(
        string Reason,
        string? PatientName,
        string? ConsultorioLabel
    );

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureTargetUserColumnAsync(conn, ct);

        var notifications = (await conn.QueryAsync<dynamic>(
            """
            SELECT TOP 40 Id, Title, Message, Category, Priority, TargetRoles,
                   CreatedAtLabel, IsRead, PatientId, AppointmentId, TargetUserId
            FROM dbo.TB_NOTIFICACIONES
            ORDER BY CreatedAt DESC
            """
        )).Select(n => new
        {
            id = (string)n.Id,
            title = (string)n.Title,
            message = (string)n.Message,
            category = (string)n.Category,
            priority = (string)n.Priority,
            targetRoles = ((string)n.TargetRoles)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            createdAt = (string)n.CreatedAtLabel,
            read = (bool)n.IsRead,
            patientId = (string?)n.PatientId,
            appointmentId = (string?)n.AppointmentId,
            targetUserId = (string?)n.TargetUserId,
        }).ToList();

        var call = await conn.QueryFirstOrDefaultAsync<dynamic>(
            """
            SELECT TOP 1 Id, RequestedByDoctor, ConsultorioLabel, Reason, PatientName,
                   Status, CreatedAtLabel, AcknowledgedBy, AcknowledgedAtLabel
            FROM dbo.TB_LLAMADOS_ASISTENTE
            WHERE Status IN ('PENDIENTE', 'EN_CAMINO')
            ORDER BY CreatedAt DESC
            """
        );

        object? activeAssistantCall = call is null
            ? null
            : new
            {
                id = (string)call.Id,
                requestedByDoctor = (string)call.RequestedByDoctor,
                consultorioLabel = (string)call.ConsultorioLabel,
                reason = (string)call.Reason,
                patientName = (string?)call.PatientName,
                status = (string)call.Status,
                createdAt = (string)call.CreatedAtLabel,
                acknowledgedBy = (string?)call.AcknowledgedBy,
                acknowledgedAt = (string?)call.AcknowledgedAtLabel,
            };

        return Ok(new { notifications, activeAssistantCall });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest req, CancellationToken ct)
    {
        var id = $"notif-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..4]}";
        var nowLabel = DateTime.Now.ToString("hh:mm tt");
        var roles = req.TargetRoles is { Count: > 0 } ? string.Join(",", req.TargetRoles) : "PEDIATRA,ASISTENTE";

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureTargetUserColumnAsync(conn, ct);
        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_NOTIFICACIONES
                (Id, Title, Message, Category, Priority, TargetRoles, CreatedAtLabel, IsRead, PatientId, AppointmentId, TargetUserId)
            VALUES
                (@Id, @Title, @Message, @Category, @Priority, @TargetRoles, @CreatedAtLabel, 0, @PatientId, @AppointmentId, @TargetUserId)
            """,
            new
            {
                Id = id,
                req.Title,
                req.Message,
                req.Category,
                Priority = string.IsNullOrWhiteSpace(req.Priority) ? "normal" : req.Priority,
                TargetRoles = roles,
                CreatedAtLabel = nowLabel,
                req.PatientId,
                req.AppointmentId,
                req.TargetUserId,
            }
        );

        return Ok(new { id, createdAt = nowLabel });
    }

    [HttpPost("call-assistant")]
    public async Task<IActionResult> CallAssistant([FromBody] CallAssistantRequest req, CancellationToken ct)
    {
        var doctorName = User.FindFirstValue(ClaimTypes.Name) ?? "Médico";
        var callId = $"call-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var nowLabel = DateTime.Now.ToString("hh:mm tt");
        var consultorio = string.IsNullOrWhiteSpace(req.ConsultorioLabel) ? "Consultorio 1" : req.ConsultorioLabel.Trim();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        await conn.ExecuteAsync(
            "UPDATE dbo.TB_LLAMADOS_ASISTENTE SET Status = 'CERRADO' WHERE Status IN ('PENDIENTE', 'EN_CAMINO')"
        );

        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_LLAMADOS_ASISTENTE
                (Id, RequestedByDoctor, ConsultorioLabel, Reason, PatientName, Status, CreatedAtLabel)
            VALUES
                (@Id, @RequestedByDoctor, @ConsultorioLabel, @Reason, @PatientName, 'PENDIENTE', @CreatedAtLabel)
            """,
            new
            {
                Id = callId,
                RequestedByDoctor = doctorName,
                ConsultorioLabel = consultorio,
                req.Reason,
                req.PatientName,
                CreatedAtLabel = nowLabel,
            }
        );

        var notifId = $"notif-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-call";
        var msg = string.IsNullOrWhiteSpace(req.PatientName)
            ? $"{doctorName}: {req.Reason}"
            : $"{doctorName}: {req.Reason} (Paciente: {req.PatientName})";

        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_NOTIFICACIONES
                (Id, Title, Message, Category, Priority, TargetRoles, CreatedAtLabel, IsRead)
            VALUES
                (@Id, @Title, @Message, 'assistant_call', 'urgent', 'ASISTENTE', @CreatedAtLabel, 0)
            """,
            new
            {
                Id = notifId,
                Title = $"Llamado urgente · {consultorio}",
                Message = msg,
                CreatedAtLabel = nowLabel,
            }
        );

        return Ok(new
        {
            id = callId,
            requestedByDoctor = doctorName,
            consultorioLabel = consultorio,
            reason = req.Reason,
            patientName = req.PatientName,
            status = "PENDIENTE",
            createdAt = nowLabel,
        });
    }

    [HttpPatch("call-assistant/acknowledge")]
    public async Task<IActionResult> AcknowledgeCall(CancellationToken ct)
    {
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "Asistente";
        var nowLabel = DateTime.Now.ToString("hh:mm tt");

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_LLAMADOS_ASISTENTE
            SET Status = 'EN_CAMINO',
                AcknowledgedBy = @AcknowledgedBy,
                AcknowledgedAtLabel = @AcknowledgedAtLabel
            WHERE Status = 'PENDIENTE'
            """,
            new { AcknowledgedBy = userName, AcknowledgedAtLabel = nowLabel }
        );

        return Ok(new { ok = true, acknowledgedBy = userName, acknowledgedAt = nowLabel });
    }

    [HttpPatch("call-assistant/dismiss")]
    public async Task<IActionResult> DismissCall(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            "UPDATE dbo.TB_LLAMADOS_ASISTENTE SET Status = 'CERRADO' WHERE Status IN ('PENDIENTE', 'EN_CAMINO')"
        );
        return Ok(new { ok = true });
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(string id, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync("UPDATE dbo.TB_NOTIFICACIONES SET IsRead = 1 WHERE Id = @Id", new { Id = id });
        return Ok(new { ok = true });
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync("UPDATE dbo.TB_NOTIFICACIONES SET IsRead = 1 WHERE IsRead = 0");
        return Ok(new { ok = true });
    }
}
