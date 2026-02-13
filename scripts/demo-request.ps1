# demo-request.ps1 — Run a demo analysis against the orchestrator

$OrchestratorUrl = if ($env:ORCHESTRATOR_URL) { $env:ORCHESTRATOR_URL } else { "http://localhost:3001" }

Write-Host "`n🧠 AgentSwarm Intelligence — Demo Request" -ForegroundColor Cyan
Write-Host "==========================================`n"

$body = @{
    query            = "Is this token safe to invest in?"
    tokenAddress     = "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9"
    budget           = 500000
    requesterAddress = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    priority         = "high"
} | ConvertTo-Json

Write-Host "📡 Sending to $OrchestratorUrl/api/orchestrator/request...`n"

try {
    $response = Invoke-RestMethod `
        -Uri "$OrchestratorUrl/api/orchestrator/request" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 60

    Write-Host "📊 Consensus Report:" -ForegroundColor Green
    Write-Host "   Score:      $($response.consensus.averageScore)/100"
    Write-Host "   Strength:   $([math]::Round($response.consensus.consensusStrength * 100))%"
    Write-Host "   Confidence: $($response.consensus.confidence)%"
    Write-Host "   Recommend:  $($response.consensus.recommendation)"
    Write-Host "   Agents:     $($response.agentCount) responded"
    Write-Host "   Cost:       $([math]::Round($response.consensus.totalCost / 1000000, 4)) STX"

    Write-Host "`n📋 Agent Responses:" -ForegroundColor Cyan
    $response.consensus.responses | ForEach-Object {
        Write-Host "   $($_.agentName): $($_.score)/100 [$($_.riskLevel)]"
    }
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Demo complete`n"
