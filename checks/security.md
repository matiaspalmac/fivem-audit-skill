# Phase 1: Security Checks

## 1.1 Server Event Exploitation (CRITICAL)

For EACH `RegisterNetEvent` / `lib.callback.register` handler in server files:

```
[ ] Uses `local src = source` (NEVER client-sent player ID)
[ ] ALL parameters type-checked (type, range, length, NaN)
[ ] Tables size-limited (reject if > MAX entries — prevents payload DoS)
[ ] Admin/job actions check permissions SERVER-SIDE before any action
[ ] Server-only internal events use AddEventHandler (not RegisterNetEvent)
[ ] Server exports validate calling resource or wrap in pcall
[ ] String parameters length-limited (prevents memory abuse)
[ ] NaN check: `if x ~= x then return end` for numeric params
```

## 1.2 SQL Injection (CRITICAL)

```
[ ] NO string concatenation in queries across all drivers (oxmysql, mysql-async, ghmattimysql)
[ ] LIKE wildcards (%, _) escaped before parameterizing
[ ] ORDER BY / column names WHITELISTED (cannot be parameterized)
[ ] No multipleStatements=true in connection string
[ ] Data read from DB not reused in concatenated queries (second-order SQLi)
[ ] mysql_connection_string uses `set` NOT `setr` (setr leaks to clients via F8 console!)
[ ] mysql_connection_string NOT in any resource file (only server.cfg)
[ ] DB user is NOT root (least-privilege: SELECT, INSERT, UPDATE, DELETE only)
[ ] No dynamic table/column names from user input
[ ] Prepared statements preferred over raw queries for repeated operations
```

Vulnerable vs fixed:
```lua
-- BAD: string concatenation
MySQL.query("SELECT * FROM users WHERE id = " .. id)
-- BAD: format string
MySQL.query(string.format("SELECT * FROM users WHERE id = '%s'", id))
-- GOOD: parameterized
MySQL.query("SELECT * FROM users WHERE id = ?", { id })
-- GOOD: named parameters (oxmysql)
MySQL.query("SELECT * FROM users WHERE id = :id", { id = id })
```

## 1.3 Money/Item Duplication (CRITICAL)

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
[ ] Floating-point precision: use integers for money (cents), never float math
[ ] Transfer operations: deduct from sender FIRST, then give to receiver
```

Mutex pattern:
```lua
local locks = {}
RegisterNetEvent('resource:buy', function(itemId)
    local src = source
    if locks[src] then return end
    locks[src] = true
    local price = Config.Items[itemId]?.price -- server-authoritative
    if not price then locks[src] = nil return end
    -- check balance → deduct → give
    locks[src] = nil
end)
AddEventHandler('playerDropped', function() locks[source] = nil end)
```

## 1.4 Command Injection & RCE (CRITICAL)

```
[ ] ExecuteCommand() NEVER with unvalidated input (whitelist only)
[ ] ExecuteCommand with add_ace/add_principal NEVER from dynamic data
[ ] os.execute / io.popen / io.open NEVER used (no legitimate FiveM use)
[ ] loadstring / load NEVER with user input or network-fetched data
[ ] json.decode wrapped in pcall
[ ] PerformHttpRequest URLs not user-controlled
[ ] No dynamic require() or dofile() with user input
[ ] RegisterCommand callbacks validate argument types
```

## 1.5 XSS in NUI (HIGH)

```
[ ] All user content HTML-escaped (textContent, not innerHTML)
[ ] No v-html (Vue) / dangerouslySetInnerHTML (React) / {@html} (Svelte) with user data
[ ] No eval() / Function() / setTimeout(string) with user input
[ ] URLs validated (http/https only, no javascript: scheme, no data: scheme)
[ ] NUI callbacks validated server-side
[ ] No postMessage without origin validation
[ ] No document.write() with dynamic content
[ ] CSP headers set if NUI serves HTML pages
```

XSS in FiveM enables:
- **Clipboard theft:** `invokeNative('fxdkClipboardRead')`
- **Command execution:** `invokeNative('chatResult')` — execute commands as victim
- **Game crash:** `invokeNative('quit')` — force disconnect
- **Cross-resource hijacking:** `top.citFrames['resourceName']` — access other resource iframes
- **WebSocket C2:** Persistent command channel via WebSocket from browser context
- **Microphone access:** Hijack iframe of voice resource that has media permissions
- **NUI callback forgery:** POST to `localhost:13172` to trigger any NUI callback

Recommend `nui_callback_strict_mode 'true'` in fxmanifest (FiveM build 9549+).

## 1.6 Rate Limiting (HIGH)

For EVERY server-side RegisterNetEvent:
```
[ ] Cooldown per source (1-3s regular, 5s+ purchases, 30s+ expensive ops)
[ ] Cooldown tables cleaned on playerDropped
[ ] DB-touching events have additional rate limiting
[ ] State bag change handlers rate-limited (prevent crash via flood)
[ ] Export calls from other resources rate-limited if DB-touching
```

Rate limit pattern:
```lua
local cooldowns = {}
RegisterNetEvent('resource:action', function()
    local src = source
    local now = os.time()
    if cooldowns[src] and now - cooldowns[src] < 3 then return end
    cooldowns[src] = now
    -- process action
end)
AddEventHandler('playerDropped', function() cooldowns[source] = nil end)
```

## 1.7 Proximity Validation (HIGH)

```
[ ] Server-side distance check using GetEntityCoords(GetPlayerPed(src))
[ ] NEVER trust client-sent coordinates
[ ] Distance checked BEFORE processing (not after)
[ ] Reasonable limits: 3-10m interactions, 50m shops, 100m max
[ ] Ped existence validated (ped ~= 0) before GetEntityCoords
```

```lua
local ped = GetPlayerPed(src)
if ped == 0 then return end
local coords = GetEntityCoords(ped)
if #(coords - targetPos) > 10.0 then return end
```

## 1.8 Entity Ownership (HIGH)

```
[ ] Client-sent netId verified via NetworkGetEntityFromNetworkId
[ ] Entity belongs to requesting player (not spoofed)
[ ] Server validates entity type before operations (GetEntityType)
[ ] DeleteEntity only on owned/permitted entities
[ ] Vehicle operations verify player is owner or has keys
[ ] Entity existence checked (DoesEntityExist) before operations
```

## 1.9 Framework-Specific Exploits (HIGH)

**ESX Legacy:**
```
[ ] exports['es_extended']:getSharedObject() (NOT TriggerEvent('esx:getSharedObject'))
[ ] esx_society events validate caller's job matches society
[ ] xPlayer.addMoney/removeMoney never receives amount from client
[ ] xPlayer.setJob validates job exists + caller has permission
[ ] ESX.GetPlayerFromId uses server source (not client-sent ID)
[ ] esx:setJob event not exposed as net event
```

**QBCore:**
```
[ ] QBCore.Functions.GetPlayer(source) used (never client-sent ID)
[ ] QBCore:Server:UseItem not used (deprecated, exploitable)
[ ] Shop prices server-side only (not from QBCore.Shared.Items on client)
[ ] Player.PlayerData.job checked server-side via GetPlayer
[ ] QBCore.Functions.CreateUseableItem validated server-side
[ ] No direct Player.Functions.SetMoney from client events
```

**QBox (ox_core):**
```
[ ] Ox.GetPlayer(source) used for player data
[ ] ox:playerLogout handler cleans cached data
[ ] ox_inventory integration uses server exports
[ ] Migration from QBCore checked for leftover deprecated patterns
```

**ND_Core:**
```
[ ] ND events use AddEventHandler only (not RegisterNetEvent)
[ ] Player identifiers not exposed to clients
[ ] NDCore.getPlayer uses source
```

## 1.10 NUI Callback Trust (CRITICAL)

NUI callbacks are POST requests to `localhost:13172` — forgeable via browser DevTools or any local HTTP client.

```
[ ] Callbacks send only intent (item ID, action name), NEVER prices/amounts
[ ] Server looks up prices from config/DB (server-authoritative)
[ ] Negative values rejected
[ ] Item IDs validated against server whitelist/registry
[ ] Callback responses don't leak sensitive server data
[ ] No callback triggers server actions without additional server validation
```

## 1.12 State Bag Exploitation (CRITICAL)

```
[ ] AddStateBagChangeHandler checks `replicated` param (reject client-set for sensitive data)
[ ] Sensitive state (admin, money, inventory, job) only set server-side
[ ] State bag payload size < 16KB (prevent crash via oversized payloads)
[ ] State bag changes rate-limited server-side
[ ] No trusting client-replicated state for permission checks
```

State bag rate limiting crash: Attackers flood state bag changes to crash the server. Mitigate with:
```cfg
set rateLimiter_stateBag_rate 75
set rateLimiter_stateBag_burst 125
```

## 1.13 Sensitive Data Exposure (MEDIUM)

```
[ ] No hardcoded webhooks/API keys/credentials in shared/client files
[ ] Player identifiers not sent to other clients
[ ] Webhooks in server_scripts only (never client or shared)
[ ] GetPlayerIdentifier not bulk-sent via PerformHttpRequest (exfiltration indicator)
[ ] Discord bot tokens not in resource code
[ ] No IP addresses or private network info in client code
[ ] OAuth tokens / session tokens not exposed client-side
[ ] Config files with secrets listed in server_scripts only
```

## 1.14 Business Logic (MEDIUM)

```
[ ] Actions not possible in invalid states (dead, handcuffed, in vehicle when shouldn't be)
[ ] Duty status checked server-side (not trusted from client)
[ ] Character switch clears all cached player data and pending transactions
[ ] Duplicate connection prevented (same license = reject in playerConnecting)
[ ] TOCTOU: time-of-check-time-of-use — verify state hasn't changed between check and action
[ ] Integer overflow: amounts checked against reasonable bounds (not just positive)
[ ] Floating-point: money calculations use integer cents, not decimal
[ ] math.random seeded properly if used for security-relevant decisions (it shouldn't be)
```

## 1.15 Server Game Events (HIGH — only if resource handles entities/combat)

```
[ ] entityCreating: unauthorized spawns cancelled, blacklisted models blocked
[ ] explosionEvent: rate limited (3/s), remote explosions rejected (>500m)
[ ] weaponDamageEvent: excessive damage (>200) rejected
[ ] clearPedTasksEvent: cancelled (prevents handcuff breaking)
[ ] ptFxEvent: rate limited (prevents particle spam crash)
[ ] fireEvent: rate limited and distance-validated
```
