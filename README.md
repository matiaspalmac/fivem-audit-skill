# FiveM Audit Skill for Claude Code

[![npm version](https://img.shields.io/npm/v/fivem-audit)](https://www.npmjs.com/package/fivem-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Complete security, performance, and compatibility audit for FiveM resources. One skill, one command. Optimized for Claude Opus 4.6.

## Install

```bash
npx fivem-audit
```

Restart Claude Code and use `/fivem-audit` in any FiveM resource directory.

**Uninstall:**
```bash
npx fivem-audit --uninstall
```

**Manual clone:**
```bash
git clone https://github.com/matiaspalmac/fivem-audit-skill.git ~/.claude/skills/fivem-audit
```

## What it does

A **4-phase professional audit** with anti-hallucination guardrails, modular check system, file prioritization (server-first), and confidence levels on every finding.

### Phase 1: Security
- SQL Injection (oxmysql, mysql-async, ghmattimysql — LIKE, ORDER BY, second-order, connection security)
- Server event exploitation (source validation, input validation, permission checks)
- Money/item duplication (race conditions, negative amounts, crash duplication, concurrent access, floating-point)
- NUI callback trust (DevTools price manipulation, server-authoritative pricing)
- XSS in NUI (invokeNative abuse: clipboard theft, command execution, game termination, iframe hijacking, WebSocket C2)
- State bag exploitation (client-replicated trust, payload size, rate limiting crash)
- Command injection & RCE (ExecuteCommand, loadstring, os.execute)
- Framework-specific exploits (ESX society drain, QBCore shop injection, deprecated patterns)
- Entity ownership hijacking, proximity validation, rate limiting
- Business logic (invalid states, duty trust, TOCTOU, duplicate connections)
- Server game events (entityCreating, explosionEvent, weaponDamageEvent, ptFxEvent)

### Phase 1b: Malware & Backdoor Detection
- **Backdoor/RAT detection** — Cipher Panel, Blum Panel, FiveHub, Dark Utilities
- **Obfuscation detection** — Hex encoding, string.char building, _G[] notation, base64, XOR encryption, Shannon entropy, Luraph/IronBrew
- **Token grabbers** — sv_licenseKey, rcon_password, mysql_connection_string, steam_webApiKey, txAdmin credentials
- **Exfiltration channels** — Discord webhooks, Telegram bots, C2 panels, data staging
- **Supply chain attacks** — System resource tampering, injected files, manifest manipulation, self-propagation
- **Persistence mechanisms** — sessionmanager injection, fxmanifest modification, temp file markers, OS-level persistence
- **16+ known malicious domains** with URL pattern matching
- **OS-level threats** — os.execute, io.popen, debug library abuse
- **ACE permission escalation** — Dynamic add_principal/add_ace
- **Crypto mining indicators** — XMRig, mining pools, WebAssembly miners

### Phase 2: Performance
- Thread analysis (Wait(0) loops, two-tier patterns, DrawMarker replacement)
- Native caching (PlayerPedId, GetHashKey, lib.cache)
- Database optimization (N+1 queries, caching, batch operations, indexes)
- Streaming assets (RequestModel without release = memory leak)
- Network overhead (broadcast reduction, state bags, latent events)
- Entity & object lifecycle management

### Phase 3: Cleanup & Stability
- playerDropped handler (cooldowns, locks, sessions, inventory locks, all source-keyed tables)
- onResourceStop handler (NUI focus, freeze, cameras, props, zones, blips, effects)
- Memory leak prevention (event handler stacking, unbounded tables)
- Error resilience (pcall on DB, exports, json.decode, nil-safe patterns)
- Resource restart safety

### Phase 4: Compatibility & Manifest
- **Frameworks:** ESX Legacy, QBCore, QBox, ox_lib, ND_Core, Standalone
- fxmanifest.lua quality (cerulean, lua54, file order, dependencies, wildcard risks)
- Framework isolation (bridge pattern, auto-detect, input validation)
- SQL schema safety (no DROP TABLE / CREATE USER)
- Lua version compatibility (5.1 vs 5.4 patterns)
- Deprecated pattern detection

## Architecture

```
fivem-audit/
  SKILL.md              Main skill — workflow, output format, scoring
  checks/
    security.md         Phase 1: Security vulnerability checks
    malware.md          Phase 1b: Malware, backdoor & supply chain detection
    performance.md      Phase 2: Performance optimization checks
    cleanup.md          Phase 3: Cleanup & stability checks
    compatibility.md    Phase 4: Compatibility & manifest checks
```

Check modules are loaded progressively — only when Claude enters each phase, keeping the context window efficient.

## Usage

```
/fivem-audit
```

Or ask naturally:
- "audit this FiveM resource"
- "check this script for security issues"
- "scan for backdoors"
- "is this script safe for production?"

## Output

Structured report with:

- **Summary** with issue counts by severity and score out of 100
- **Quick Wins** — fixes that take less than 5 minutes
- **Findings** with confidence level (CONFIRMED/SUSPECTED), file:line, exploit steps, and copy-paste fixes
- **Performance risk** based on pattern analysis (Wait(0) count, DrawMarker loops, unreleased assets)
- **Backdoor & malware scan** results (8 indicator categories)
- **Server ConVar recommendations** with a complete hardening block
- **Auto-fix options** (all, critical only, security only, performance only, interactive)

### Scoring

| Score | Status |
|-------|--------|
| 80-100 AND 0 CRITICAL | Production ready |
| 60-79 OR has CRITICAL | Needs fixes before production |
| 0-59 | Not ready for production |

**CRITICAL gate:** Any unresolved CRITICAL finding = not production ready, regardless of score.

### Severity Levels

| Level | Examples | Deduction |
|-------|---------|-----------|
| CRITICAL | SQLi, money dupe, RCE, backdoor, NUI price manipulation, token grabber | -15 |
| HIGH | XSS, DoS, entity hijacking, concurrent access abuse, supply chain | -8 |
| MEDIUM | Info exposure, anti-cheat gaps, moderate perf impact | -3 |
| LOW | Code quality, naming, minor optimization | -1 |

Compound risks (SQLi + no rate limit, backdoor indicators, token grabbers, supply chain) apply additional -5 to -20 penalties.

## Frameworks Supported

| Framework | Checks |
|-----------|--------|
| ESX Legacy | getSharedObject, xPlayer API, society funds, billing, job events |
| QBCore | GetCoreObject, Player.Functions, shop injection, PlayerData trust |
| QBox (ox_core) | Ox.GetPlayer, ox_inventory, migration gap detection |
| ox_lib | lib.callback, lib.zones, lib.cache, MySQL wrapper |
| ND_Core | Event safety model, identifier exposure |
| Standalone | ACE permissions, native FiveM APIs |

## What's New in v3.0

- Optimized for **Claude Opus 4.6** (`effort: max`, `allowed-tools`)
- **Dedicated malware detection module** with 13 detection categories
- **Supply chain attack detection** — system resource tampering, injected files, manifest manipulation
- **Token grabber patterns** — sv_licenseKey, rcon_password, mysql_connection_string, txAdmin
- **Advanced obfuscation detection** — hex arrays, XOR (Blum), base64, Shannon entropy, commercial obfuscators
- **Exfiltration channel detection** — Discord webhooks, Telegram bots, C2 panels
- **16+ known malicious domains** (Cipher, Blum, FiveHub, Dark Utilities, and more)
- **Expanded NUI/CEF exploitation** — iframe hijacking, WebSocket C2, microphone access
- **Modular architecture** — progressive check loading for context window efficiency
- **New vulnerability checks** — TOCTOU, floating-point precision, state bag flooding, ptFxEvent
- **Persistence mechanism detection** — sessionmanager injection, temp markers, OS-level

## License

MIT License - Dei
