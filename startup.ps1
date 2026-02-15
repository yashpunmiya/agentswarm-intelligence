#!/usr/bin/env powershell
# startup.ps1 — Start all AgentSwarm services

$projectPath = "c:\Users\yyash\Coding\x402\agentswarm-intelligence"
Set-Location $projectPath

Write-Host "`n🚀 AgentSwarm Intelligence Network — Starting All Services`n" -ForegroundColor Cyan

# Check if concurrently is installed
$concurrentlyPath = ".\node_modules\.bin\concurrently.cmd"
if (-not (Test-Path $concurrentlyPath)) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "`nStarting frontend, orchestrator, and agents...`n" -ForegroundColor Green

# Start all services
npm run dev
