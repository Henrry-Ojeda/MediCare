using System.Data;
using Microsoft.Data.SqlClient;

namespace MediCare.API.Services;

public sealed class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("BD_MEDICARE")
            ?? throw new InvalidOperationException("No se encontró la cadena de conexión 'BD_MEDICARE'.");
    }

    public async Task<SqlConnection> CreateOpenConnectionAsync(CancellationToken ct = default)
    {
        var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        return conn;
    }

    public IDbConnection CreateConnection() => new SqlConnection(_connectionString);
}

