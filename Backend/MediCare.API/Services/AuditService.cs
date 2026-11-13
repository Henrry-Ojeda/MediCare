using System.Data;
using System.Security.Claims;
using System.Text.Json;
using Dapper;

namespace MediCare.API.Services;

public sealed class AuditService
{
    public async Task RecordAsync(
        IDbConnection conn,
        IDbTransaction? tx,
        HttpContext httpContext,
        string actionType,
        string? entityName = null,
        string? entityId = null,
        Guid? patientId = null,
        object? previousValue = null,
        object? newValue = null,
        string? fallbackUserName = null,
        string? fallbackUserRole = null)
    {
        var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(userIdClaim, out var parsed) ? parsed : null;

        var userName = httpContext.User.FindFirstValue(ClaimTypes.Name)
            ?? fallbackUserName
            ?? "Sistema";

        var userRole = httpContext.User.FindFirstValue(ClaimTypes.Role)
            ?? fallbackUserRole
            ?? "Sistema";

        var ipAddress = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
            ?? httpContext.Connection.RemoteIpAddress?.ToString()
            ?? "0.0.0.0";

        const string sql = """
            INSERT INTO dbo.TB_AUDITORIA (
                UserId, UserName, UserRole, ActionType, EntityName, EntityId,
                PatientId, IpAddress, PreviousValueJson, NewValueJson
            )
            VALUES (
                @UserId, @UserName, @UserRole, @ActionType, @EntityName, @EntityId,
                @PatientId, @IpAddress, @PreviousValueJson, @NewValueJson
            )
            """;

        await conn.ExecuteAsync(
            sql,
            new
            {
                UserId = userId,
                UserName = userName,
                UserRole = userRole,
                ActionType = actionType,
                EntityName = entityName,
                EntityId = entityId,
                PatientId = patientId,
                IpAddress = ipAddress,
                PreviousValueJson = previousValue is null ? null : JsonSerializer.Serialize(previousValue),
                NewValueJson = newValue is null ? null : JsonSerializer.Serialize(newValue),
            },
            transaction: tx
        );
    }
}

