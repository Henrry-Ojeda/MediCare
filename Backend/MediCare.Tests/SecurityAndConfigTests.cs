using MediCare.API.Controllers;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace MediCare.Tests;

public class SecurityAndConfigTests
{
    [Fact]
    public void PatientsController_RestrictsAccessToClinicalRoles()
    {
        var attr = typeof(PatientsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: false)
            .OfType<AuthorizeAttribute>()
            .FirstOrDefault();

        Assert.NotNull(attr);
        Assert.Contains("PEDIATRA", attr!.Roles);
        Assert.Contains("MEDICO", attr.Roles);
        Assert.DoesNotContain("ADMIN,", attr.Roles);
    }

    [Fact]
    public void AuthController_Login_HasRateLimitingPolicy()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Login));
        Assert.NotNull(method);

        var rateLimitAttr = method!
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: false)
            .OfType<EnableRateLimitingAttribute>()
            .FirstOrDefault();

        Assert.NotNull(rateLimitAttr);
        Assert.Equal("login", rateLimitAttr!.PolicyName);
    }

    [Fact]
    public void DbConnectionFactory_ThrowsWhenConnectionStringMissing()
    {
        var emptyConfig = new ConfigurationBuilder().Build();
        Assert.Throws<InvalidOperationException>(() => new DbConnectionFactory(emptyConfig));
    }

    [Fact]
    public async Task AuthController_Login_ReturnsBadRequest_WhenCredentialsAreEmpty()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:BD_MEDICARE"] = "Server=localhost;Database=Test;"
            })
            .Build();
        var db = new DbConnectionFactory(config);
        var audit = new AuditService();
        var controller = new AuthController(db, config, audit);

        var result = await controller.Login(new AuthController.LoginRequest("", null, ""), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
