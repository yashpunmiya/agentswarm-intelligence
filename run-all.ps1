#!/usr/bin/env powershell
# run-all.ps1 — Start all services individually for easier management

$projectRoot = "c:\Users\yyash\Coding\x402\agentswarm-intelligence"

Write-Host "`n🚀 AgentSwarm Intelligence Network — Starting All Services" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Starting services on ports: 3000 (frontend) + 3001-3006 (backend)`n" -ForegroundColor Green

# Services to start
$services = @(
    @{ name = "Frontend"; path = "frontend"; cmd = "npm run dev"; port = "3000" },
    @{ name = "Orchestrator"; path = "backend/orchestrator"; cmd = "npm run dev"; port = "3001" },
    @{ name = "SecurityAgent"; path = "backend/agents/security"; cmd = "npm run dev"; port = "3002" },
    @{ name = "DataAgent"; path = "backend/agents/data"; cmd = "npm run dev"; port = "3003" },
    @{ name = "SocialAgent"; path = "backend/agents/social"; cmd = "npm run dev"; port = "3004" },
    @{ name = "PriceAgent"; path = "backend/agents/price"; cmd = "npm run dev"; port = "3005" },
    @{ name = "HistoryAgent"; path = "backend/agents/history"; cmd = "npm run dev"; port = "3006" }
)

Write-Host "To run all services, copy and paste into separate PowerShell windows:`n" -ForegroundColor Yellow

foreach ($svc in $services) {
    $cmd = "cd '$projectRoot\$($svc.path)'; npm run dev"
    Write-Host "# $($svc.name) (port $($svc.port))" -ForegroundColor Green
    Write-Host $cmd
    Write-Host ""
}

Write-Host "`nOr run them all with Windows Terminal profiles...`n" -ForegroundColor Cyan
