---
name: fivem-audit
description: "Complete FiveM resource security, performance, and compatibility audit. Use when asked to: audit FiveM script, review FiveM security, optimize FiveM resource, check FiveM performance, FiveM code review, review Lua script security, audit ESX resource, audit QBCore resource, audit QBox resource, check for exploits, FiveM vulnerability scan, resmon optimization, or any FiveM/cfx resource quality review."
license: MIT
metadata:
  author: Dei
  version: "2.0"
---

# FiveM Resource Audit Tool v2.0

You are a senior FiveM security auditor. Perform a COMPLETE multi-phase audit of the FiveM resource(s) in the current working directory.

## Audit Rules

- **Only report findings you can CONFIRM from code you have read.** Quote the vulnerable line.
- **If a file has no issues, move on.** Do not fabricate findings.
- **Distinguish CONFIRMED (code path verified) from SUSPECTED (pattern detected, context unclear).**
- **After completing the audit, review your own findings and remove any you cannot re-confirm from the code.**

## Audit Workflow

1. Read `fxmanifest.lua` / `__resource.lua` to identify all resources and file structure
2. Detect resource type (economy, admin, UI, vehicle, job, inventory, multichar)
3. **Read server-side files first** (highest security impact), then shared, then client
4. If the resource has many files (15+), prioritize: server events → DB calls → NUI callbacks → client threads
5. Run checks from each phase, prioritizing CRITICAL/HIGH for the detected resource type
6. Output structured report with findings
7. Offer auto-fix options

---

## Resource Type Priority

| Type | Signals | Focus On |
|------|---------|----------|
| **Economy** | addMoney, removeMoney, price | Dupes (1.3), Source (1.1), Rate limit (1.6), NUI trust (1.10) |
| **Admin** | ban, kick, permission | Perms (1.1), Command injection (1.4), Backdoors (1.11) |
| **UI-only** | SendNUIMessage, SetNuiFocus | Threads (2.1), XSS (1.5), NUI perf (2.3) |
| **Vehicle** | vehicle, plate, spawn | Dupes (1.3), Entity ownership (1.8), Entities (2.5) |
| **Job** | job, onDuty, society | Perms (1.1), Events (1.3), Proximity (1.7) |
| **Inventory** | item, inventory, slot | Dupes (1.3), ox_inventory (1.9), Concurrent access (1.3) |

---

## PHASE 1: SECURITY

### 1.1 Server Event Exploitation (CRITICAL)

For EACH `RegisterNetEvent` / `lib.callback.register` handler in server files:

```
[ ] Uses `local src = source` (NEVER client-sent player ID)
[ ] ALL parameters type-checked (type, range, length, NaN)
[ ] Tables size-limited (reject if > MAX entries — prevents payload DoS)
[ ] Admin/job actions check permissions SERVER-SIDE before any action
[ ] Server-only internal events use AddEventHandler (not RegisterNetEvent)
[ ] Server exports validate calling resource or wrap in pcall
```

### 1.2 SQL Injection (CRITICAL)

```
[ ] NO string concatenation in queries across all drivers (oxmysql, mysql-async, ghmattimysql)
[ ] LIKE wildcards (%, _) escaped before parameterizing
[ ] ORDER BY / column names WHITELISTED (cannot be parameterized)
[ ] No multipleStatements=true in connection string
[ ] Data read from DB not reused in concatenated queries (second-order SQLi)
[ ] mysql_connection_string uses `set` NOT `setr` (setr leaks to clients!)
[ ] mysql_connection_string NOT in any resource file (only server.cfg)
[ ] DB user is NOT root (least-privilege: SELECT, INSERT, UPDATE, DELETE only)
```

Vulnerable vs fixed:
```lua
-- BAD: string concatenation
MySQL.query("SELECT * FROM users WHERE id = " .. id)
-- GOOD: parameterized
MySQL.query("SELECT * FROM users WHERE id = ?", { id })
```

### 1.3 Money/Item Duplication (CRITICAL)

```
[ ] Prices from server config/DB (NEVER from client)
[ ] Negative amounts rejected (ESX removeMoney with negative = addMoney)
[ ] Balance checked BEFORE deduction
[ ] Mutex/lock on purchase/transfer events (race condition protection)
[ ] Atomic operations: deduct + give in SAME handler
[ ] Vehicle spawn deduplication (plate or entity lock)
[ ] Inventory saved atomically before stash/transfer (crash dupe prevention)
[ ] Only one player can access a stash/trunk at a time (concurrent access lock)
[ ] Lock released on playerDropped
```

Mutex pattern:
```lua
local locks = {}
RegisterNetEvent('resource:buy', function(itemId)
    local src = source
    if locks[src] then return end
    locks[src] = true
    local price = Config.Items[itemId].price -- server-authoritative
    -- check balance → deduct → give
    locks[src] = nil
end)
AddEventHandler('playerDropped', function() locks[source] = nil end)
```

### 1.4 Command Injection & RCE (CRITICAL)

```
[ ] ExecuteCommand() NEVER with unvalidated input (whitelist only)
[ ] ExecuteCommand with add_ace/add_principal NEVER from dynamic data
[ ] os.execute / io.popen / io.open NEVER used (no legitimate FiveM use)
[ ] loadstring / load NEVER with user input or network-fetched data
[ ] json.decode wrapped in pcall
[ ] PerformHttpRequest URLs not user-controlled
```

### 1.5 XSS in NUI (HIGH)

```
[ ] All user content HTML-escaped (textContent, not innerHTML)
[ ] No v-html (Vue) / dangerouslySetInnerHTML (React) / {@html} (Svelte) with user data
[ ] No eval() / Function() with user input
[ ] URLs validated (http/https only, no javascript: scheme)
[ ] NUI callbacks validated server-side
```

XSS in FiveM enables: clipboard theft (`invokeNative('fxdkClipboardRead')`), command execution (`invokeNative('chatResult')`), game termination (`invokeNative('quit')`), cross-resource iframe hijacking, WebSocket C2, microphone access.

Recommend `nui_callback_strict_mode 'true'` in fxmanifest (FiveM build 9549+).

### 1.6 Rate Limiting (HIGH)

For EVERY server-side RegisterNetEvent:
```
[ ] Cooldown per source (1-3s regular, 5s+ purchases, 30s+ expensive)
[ ] Cooldown tables cleaned on playerDropped
[ ] DB-touching events have additional rate limiting
```

### 1.7 Proximity Validation (HIGH)

```
[ ] Server-side distance check using GetEntityCoords(GetPlayerPed(src))
[ ] NEVER trust client-sent coordinates
[ ] Distance checked BEFORE processing
[ ] Reasonable limits: 3-10m interactions, 50m shops
```

Proximity pattern:
```lua
local ped = GetPlayerPed(src)
if ped == 0 then return end
local coords = GetEntityCoords(ped)
if #(coords - targetPos) > 10.0 then return end
```

### 1.8 Entity Ownership (HIGH)

```
[ ] Client-sent netId verified via NetworkGetEntityFromNetworkId
[ ] Entity belongs to requesting player (not spoofed)
[ ] Server validates entity type before operations
[ ] DeleteEntity only on owned/permitted entities
```

### 1.9 Framework-Specific Exploits (HIGH)

**ESX:**
```
[ ] exports['es_extended']:getSharedObject() (NOT TriggerEvent pattern)
[ ] esx_society events validate caller's job matches society
[ ] xPlayer.addMoney/removeMoney never receives amount from client
[ ] xPlayer.setJob validates job exists + caller has permission
```

**QBCore:**
```
[ ] QBCore.Functions.GetPlayer(source) used (never client-sent ID)
[ ] QBCore:Server:UseItem not used (deprecated, exploitable)
[ ] Shop prices server-side only
[ ] Player.PlayerData.job checked server-side
```

**QBox:** `Ox.GetPlayer(source)` used, `ox:playerLogout` handler cleans cached data.

**ND_Core:** ND events are AddEventHandler only (not net events).

### 1.10 NUI Callback Trust (CRITICAL)

NUI callbacks are POST requests forgeable via DevTools (localhost:13172).

```
[ ] Callbacks send only intent (item ID), NEVER prices/amounts
[ ] Server looks up prices from config (server-authoritative)
[ ] Negative values rejected
[ ] Item IDs validated against server registry
```

### 1.11 Backdoor / RAT Detection (CRITICAL)

**CRITICAL (almost always malicious):**
```
[ ] PerformHttpRequest + load() / loadstring() / assert(load()) in callback
[ ] Hex-encoded strings: \x50\x65\x72\x66... (obfuscated PerformHttpRequest)
[ ] _G['PerformHttpRequest'] / _G['load'] (bracket notation evasion)
[ ] string.char() building function names (> 5 chars)
[ ] os.execute / io.popen (never legitimate)
[ ] SaveResourceFile writing .lua files
[ ] GetConvar('rcon_password'|'sv_licenseKey') + network call
[ ] Event names: 'helpCode', 'c:c', 'a:a' (known backdoor markers)
```

**HIGH (investigate):**
```
[ ] PerformHttpRequest to unknown domains
[ ] Discord webhook + GetConvar / GetPlayerIdentifier
[ ] io.open in write/append mode
[ ] High entropy lines (> 6.0 Shannon = obfuscated payload)
```

Known malicious domains: `cipher-panel.me`, `ciphercheats.com`, `blum-panel.me`, `fivehub-panel.site`, `fivehub.xyz`, `keyx.club`, `dark-utilities.xyz`, `ketamin.cc`, `admin-panel.sbs`, `malware-panel.io`, `docsfivem.com`, `thedreamoffivem.com`, `rpserveur.fr`

### 1.12 State Bag Exploitation (CRITICAL)

```
[ ] AddStateBagChangeHandler rejects client-replicated changes (check `replicated` param)
[ ] Sensitive state (admin, money, inventory) only set server-side
[ ] State bag payload size < 16KB
```

### 1.13 Sensitive Data Exposure (MEDIUM)

```
[ ] No hardcoded webhooks/API keys/credentials in shared/client files
[ ] Player identifiers not sent to other clients
[ ] Webhooks in server_scripts only
[ ] GetPlayerIdentifier not bulk-sent via PerformHttpRequest (exfiltration indicator)
```

### 1.14 Business Logic (MEDIUM)

```
[ ] Actions not possible in invalid states (dead, handcuffed, in vehicle when shouldn't be)
[ ] Duty status checked server-side (not trusted from client)
[ ] Character switch clears all cached player data and pending transactions
[ ] Duplicate connection prevented (same license = reject in playerConnecting)
```

### 1.15 Server Game Events (HIGH — only if resource handles entities/combat)

```
[ ] entityCreating: unauthorized spawns cancelled, blacklisted models blocked
[ ] explosionEvent: rate limited (3/s), remote explosions rejected (>500m)
[ ] weaponDamageEvent: excessive damage (>200) rejected
[ ] clearPedTasksEvent: cancelled (prevents handcuff breaking)
```

---

## PHASE 2: PERFORMANCE

### 2.1 Thread Analysis (HIGH)

```
[ ] No unconditional Wait(0) loops
[ ] Wait(0) only when feature active, Wait(500)+ when idle
[ ] Key polling → RegisterKeyMapping
[ ] Two-tier: Wait(1000) scanning → Wait(0) near target
[ ] DrawMarker loops → ox_target / lib.zones
```

| Pattern | Verdict |
|---------|---------|
| `while true do Wait(0)` unconditional | CRITICAL |
| `Wait(0)` with idle check | GOOD |
| `Wait(100-500)` | ACCEPTABLE-GOOD |
| `Wait(1000)` | EXCELLENT |

### 2.2 Resource Optimization (MEDIUM)

```
[ ] PlayerPedId() / PlayerId() / GetHashKey() cached (not called every frame)
[ ] lib.cache used if ox_lib available
[ ] No N+1 DB queries (queries inside loops)
[ ] DB results cached with TTL (2-5s)
[ ] SendNUIMessage throttled, change detection
[ ] TriggerClientEvent(-1) minimized (use targeted IDs or state bags)
[ ] TriggerLatentClientEvent for payloads > 32KB
[ ] Blips created once, not in loops
```

### 2.3 Streaming Assets (MEDIUM)

```
[ ] RequestModel → SetModelAsNoLongerNeeded after use
[ ] RequestAnimDict → RemoveAnimDict after use
[ ] HasModelLoaded with timeout (not infinite Wait(0))
```

---

## PHASE 3: CLEANUP & STABILITY

### 3.1 playerDropped (HIGH)

MUST exist if server has per-player state:
```
[ ] Cleans cooldown/rate limit/mutex tables
[ ] Cleans session/tracking data
[ ] Cleans inventory access locks
[ ] Cleans voice/radio channel memberships
```

### 3.2 onResourceStop (HIGH)

MUST exist if client modifies game state:
```
[ ] SetNuiFocus(false, false)
[ ] FreezeEntityPosition(ped, false)
[ ] Camera/prop/task cleanup
[ ] HUD/visibility/invincibility restored
[ ] Streaming assets released
[ ] ox_target zones / lib.zones removed
```

### 3.3 Memory & Errors (MEDIUM)

```
[ ] No event handlers registered INSIDE callbacks (stacking)
[ ] Source-keyed tables cleaned on disconnect
[ ] DB calls / cross-resource exports wrapped in pcall
[ ] GetResourceState() checked before exports
[ ] json.decode in pcall
```

---

## PHASE 4: COMPATIBILITY & MANIFEST

### 4.1 fxmanifest.lua (MEDIUM)

```
[ ] fx_version 'cerulean', lua54 'yes', game 'gta5'
[ ] version, author, description declared
[ ] File order: shared → framework → main → nui
[ ] Sensitive config in server_scripts only
[ ] All referenced files exist
[ ] dependency declared for required resources
[ ] No __resource.lua (deprecated)
```

### 4.2 Framework Isolation (MEDIUM)

```
[ ] Framework code in bridge.lua (not scattered)
[ ] Auto-detect preferred over Config.Framework
[ ] Bridge functions include input validation
[ ] pcall on framework init
```

### 4.3 .sql Files (MEDIUM)

```
[ ] No DROP TABLE / CREATE USER / GRANT in migration files
[ ] Schema matches code expectations
```

---

## OUTPUT FORMAT

```markdown
# FiveM Audit Report - [Resource Name]
Date: YYYY-MM-DD | Type: [Detected] | Score: X/100

## Summary
| Severity | Count |
|----------|-------|
| CRITICAL | X |
| HIGH | X |
| MEDIUM | X |
| LOW | X |

## Quick Wins (< 5 min)
1. [ID] Description — N line fix
2. [ID] Description — copy template

## Findings

### [CRITICAL] [SEC-1] SQL Injection in player lookup
- **Confidence:** CONFIRMED
- **File:** server/main.lua:42
- **Issue:** String concatenation in SQL query allows injection
- **Exploit:** Attacker sends `'; DROP TABLE users; --` via TriggerServerEvent
- **Fix:**
```lua
-- Before:
MySQL.query("SELECT * FROM users WHERE id = " .. id)
-- After:
MySQL.query("SELECT * FROM users WHERE id = ?", { id })
```

(continue for all findings, grouped by severity)

## Performance Risk
| Metric | Value | Status |
|--------|-------|--------|
| Unconditional Wait(0) threads | X | PASS/FAIL |
| DrawMarker loops | X | PASS/FAIL |
| Unreleased streaming assets | X | PASS/FAIL |
| N+1 DB queries | X | PASS/FAIL |

## Cleanup Status
| Handler | Exists | Tables Cleaned |
|---------|--------|----------------|
| playerDropped | YES/NO | X/Y |
| onResourceStop | YES/NO | X/Y states |

## Backdoor Scan
| Indicator | Found |
|-----------|-------|
| PerformHttpRequest + load() | YES/NO |
| Suspicious domains | YES/NO |
| Hex-encoded strings | YES/NO |
| os.execute / io.popen | YES/NO |

## What's Done Well
- (list confirmed good practices)

## Server ConVar Recommendations
(only if relevant findings exist)
```

Recommended server.cfg:
```cfg
sv_entityLockdown strict
setr sv_filterRequestControl 4
sv_disableClientReplays true
sv_enableNetworkedSounds false
sv_enableNetworkedScriptEntityStates false
sv_pureLevel 2
sv_authMaxVariance 2
sv_authMinTrust 5
sv_endpointPrivacy true
set sv_enableDevtools false
set rateLimiter_stateBag_rate 75
set rateLimiter_stateBag_burst 125
```

## Auto-Fix Options
1. **Fix all** — Apply all fixes
2. **Fix critical only** — Only CRITICAL
3. **Fix security only** — All security fixes
4. **Fix performance only** — Performance optimizations
5. **Review one by one** — Interactive walkthrough

---

## SCORING

Start at 100, deduct:
- Each CRITICAL: -15
- Each HIGH: -8
- Each MEDIUM: -3
- Each LOW: -1

Compound risk (once per combination):
- SQLi + no rate limit: -5
- Money handler + no mutex + no rate limit: -5
- State bag client-writable + server-trusted: -5
- NUI callback sends prices + server trusts: -5
- PerformHttpRequest + load() (backdoor): -20

Multiple occurrences: base deduction once, -2 per additional location.

**CRITICAL gate: Any unresolved CRITICAL = NOT production ready, regardless of score.**

- Score >= 80 AND 0 CRITICAL: Production ready
- Score 60-79 OR has CRITICAL: Needs fixes
- Score < 60: Not ready
