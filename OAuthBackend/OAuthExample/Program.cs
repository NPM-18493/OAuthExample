using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Configure CORS so the SPA (e.g. http://localhost:3000) can call this API
var spaOrigin = builder.Configuration["Spa:ClientUrl"] ?? "http://localhost:3000";
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(spaOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var authority = builder.Configuration["Authentication:Google:Authority"];
var audience = builder.Configuration["Authentication:Google:ClientId"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // read Google client id from configuration (fall back to the existing audience value)
        var googleClientId = audience;

        options.Authority = authority;
        // ensure the expected audience is the Google client id
        options.Audience = googleClientId;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidAudiences = new[] { googleClientId },
            // Google tokens sometimes use "accounts.google.com" (without scheme) or "https://accounts.google.com"
            ValidIssuers = new[] { "https://accounts.google.com", "accounts.google.com" }
        };

        // In development you may disable https requirement for metadata, but keep it enabled for production
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment() ? true : false;

        // add logging to surface token validation failures for easier debugging
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError(ctx.Exception, "JWT authentication failed: {Message}", ctx.Exception.Message);
                return Task.CompletedTask;
            },
            OnTokenValidated = ctx =>
            {
                var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogInformation("Token validated for {Name}", ctx.Principal?.Identity?.Name);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Enable CORS for SPA
app.UseCors();

// Enable authentication & authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};


app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.RequireAuthorization();

// As Google's OAuth PKCE asks for Client Secret on SPA as well, we need to exchange the authorization code for tokens on the backend
app.MapPost("/exchange-code", async (HttpContext http, IConfiguration config) =>
 {
     var form = await http.Request.ReadFormAsync();
     var code = form["code"].ToString();
     var codeVerifier = form["code_verifier"].ToString();
     var redirectUri = form["redirect_uri"].ToString();

     var clientId = config["Authentication:Google:ClientId"];
     var clientSecret = config["Authentication:Google:ClientSecret"];

     using var httpClient = new HttpClient();
     var tokenRequest = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token");

     var postParams = new Dictionary<string, string>
    {
        { "code", code },
        { "client_id", clientId ?? "" },
        { "client_secret", clientSecret ?? "" },
        { "redirect_uri", "http://localhost:3000/google-sign-in" },
        { "grant_type", "authorization_code" }
    };

     if (!string.IsNullOrEmpty(redirectUri))
     {
         postParams["redirect_uri"] = redirectUri;
     }

     if (!string.IsNullOrEmpty(codeVerifier))
     {
         postParams["code_verifier"] = codeVerifier;
     }

     tokenRequest.Content = new FormUrlEncodedContent(postParams);

     var response = await httpClient.SendAsync(tokenRequest);
     if (!response.IsSuccessStatusCode)
     {
         return Results.Problem("Failed to exchange authorization code for tokens", statusCode: 500);
     }

     var content = await response.Content.ReadAsStringAsync();
     return Results.Content(content, "application/json");
 });

// api to get new id token using refresh token
app.MapPost("/refresh-token", async (HttpContext http, IConfiguration config) =>
{
    var form = await http.Request.ReadFormAsync();
    var refreshToken = form["refresh_token"].ToString();

    var clientId = config["Authentication:Google:ClientId"];
    var clientSecret = config["Authentication:Google:ClientSecret"];

    using var httpClient = new HttpClient();
    var tokenRequest = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token");

    var postParams = new Dictionary<string, string>
    {
        { "client_id", clientId ?? "" },
        { "client_secret", clientSecret ?? "" },
        { "refresh_token", refreshToken },
        { "grant_type", "refresh_token" }
    };

    tokenRequest.Content = new FormUrlEncodedContent(postParams);

    var response = await httpClient.SendAsync(tokenRequest);
    if (!response.IsSuccessStatusCode)
    {
        return Results.Problem("Failed to refresh tokens", statusCode: 500);
    }

    var content = await response.Content.ReadAsStringAsync();
    return Results.Content(content, "application/json");
});

// Protected endpoint the SPA can call with a Bearer access token
app.MapGet("/me", (ClaimsPrincipal user) =>
{
    return Results.Json(new
    {
        Name = user.Identity?.Name,
        AuthenticationType = user.Identity?.AuthenticationType,
        Claims = user.Claims.Select(c => new { c.Type, c.Value })
    });
}).RequireAuthorization();

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
