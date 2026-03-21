# FiveM Audit Skill for Claude Code

[![npm version](https://img.shields.io/npm/v/fivem-audit)](https://www.npmjs.com/package/fivem-audit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Complete security, performance, and compatibility audit for FiveM resources. One skill, one command.

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

A **4-phase professional audit** with anti-hallucination guardrails, file prioritization (server-first), and confidence levels on every finding.

### Phase 1: Security
- SQL Injection (oxmysql, mysql-async, ghmattimysql — LIKE, ORDER BY, second-order, connection security)
- Server event exploitation (source validation, input validation, permission checks)
- Money/item duplication (race conditions, negative amounts, crash duplication, concurrent access)
- NUI callback trust (DevTools price manipulation, server-authoritative pricing)
- Backdoor/RAT detection (Cipher, Blum, FiveHub — 13+ known malicious domains)
- XSS in NUI (invokeNative abuse: clipboard theft, command execution, game termination)
- State bag exploitation (client-replicated trust, payload size)
- Command injection & RCE (ExecuteCommand, loadstring, os.execute)
- Framework-specific exploits (ESX society drain, QBCore shop injection, deprecated patterns)
- Entity ownership hijacking, proximity validation, rate limiting
- Business logic (invalid states, duty trust, duplicate connections)
- Server game events (entityCreating, explosionEvent, weaponDamageEvent)

### Phase 2: Performance
- Thread analysis (Wait(0) loops, two-tier patterns, DrawMarker replacement)
- Native caching (PlayerPedId, GetHashKey, lib.cache)
- Database optimization (N+1 queries, caching, connection pool)
- Streaming assets (RequestModel without release = memory leak)
- Network overhead (broadcast reduction, state bags, latent events)

### Phase 3: Cleanup & Stability
- playerDropped handler (cooldowns, locks, sessions, inventory locks)
- onResourceStop handler (NUI focus, freeze, cameras, props, zones)
- Memory leak detection (event handler stacking, unbounded tables)
- Error resilience (pcall on DB, exports, json.decode)

### Phase 4: Compatibility & Manifest
- **Frameworks:** ESX Legacy, QBCore, QBox, ox_lib, ND_Core, Standalone
- fxmanifest.lua quality (cerulean, lua54, file order, dependencies)
- Framework isolation (bridge pattern, auto-detect, input validation)
- SQL schema safety (no DROP TABLE / CREATE USER in .sql files)

## Usage

```
/fivem-audit
```

Or ask naturally:
- "audit this FiveM resource"
- "check this script for security issues"
- "is this script safe for production?"

## Output

Structured report with:

- **Summary** with issue counts by severity and score out of 100
- **Quick Wins** — fixes that take less than 5 minutes
- **Findings** with confidence level (CONFIRMED/SUSPECTED), file:line, exploit steps, and copy-paste fixes
- **Performance risk** based on pattern analysis (Wait(0) count, DrawMarker loops, unreleased assets)
- **Backdoor scan** results
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
| CRITICAL | SQLi, money dupe, RCE, backdoor, NUI price manipulation | -15 |
| HIGH | XSS, DoS, entity hijacking, concurrent access abuse | -8 |
| MEDIUM | Info exposure, anti-cheat gaps, moderate perf impact | -3 |
| LOW | Code quality, naming, minor optimization | -1 |

Compound risks (SQLi + no rate limit, backdoor indicators) apply additional penalties.

## Frameworks Supported

| Framework | Checks |
|-----------|--------|
| ESX Legacy | getSharedObject, xPlayer API, society funds, billing, job events |
| QBCore | GetCoreObject, Player.Functions, shop injection, PlayerData trust |
| QBox (ox_core) | Ox.GetPlayer, ox_inventory, migration gap detection |
| ox_lib | lib.callback, lib.zones, lib.cache, MySQL wrapper |
| ND_Core | Event safety model, identifier exposure |
| Standalone | ACE permissions, native FiveM APIs |

## License

MIT License - Dei
