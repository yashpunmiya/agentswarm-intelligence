# test-system.ps1 — Health-check all services

Write-Host "`n🔍 AgentSwarm Intelligence Network — System Test" -ForegroundColor Cyan
Write-Host "================================================"

$services = @(
    @{ Name = "Orchestrator";  Url = "http://localhost:3001/health" },
    @{ Name = "SecurityAgent"; Url = "http://localhost:3002/health" },
    @{ Name = "DataAgent";     Url = "http://localhost:3003/health" },
    @{ Name = "SocialAgent";   Url = "http://localhost:3004/health" },
    @{ Name = "PriceAgent";    Url = "http://localhost:3005/health" },
    @{ Name = "HistoryAgent";  Url = "http://localhost:3006/health" }
)

foreach ($svc in $services) {
    try {
        $r = Invoke-RestMethod -Uri $svc.Url -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  ✓ $($svc.Name) — $($r.status)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $($svc.Name) — unreachable" -ForegroundColor Red
    }
}

Write-Host "`n🔍 Agent Registry:" -ForegroundColor Cyan
try {
    $agents = Invoke-RestMethod -Uri "http://localhost:3001/api/agents" -TimeoutSec 5
    $agents.agents | ForEach-Object {
        Write-Host "  • $($_.name) | Rep: $($_.reputation)% | Price: $([math]::Round($_.basePrice / 1000000, 2)) STX"
    }
} catch {
    Write-Host "  (orchestrator unreachable)" -ForegroundColor Yellow
}
Write-Host "`n✅ System test complete`n"
