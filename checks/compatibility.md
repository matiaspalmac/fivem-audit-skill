# Phase 4: Compatibility & Manifest Checks

## 4.1 fxmanifest.lua (MEDIUM)

```
[ ] fx_version 'cerulean' (latest stable)
[ ] lua54 'yes' (enables Lua 5.4 features and performance)
[ ] game 'gta5' (or 'rdr3' if applicable)
[ ] version declared (semantic versioning preferred)
[ ] author declared
[ ] description declared
[ ] File order: shared_scripts → client_scripts → server_scripts → ui_page/nui
[ ] Sensitive config files in server_scripts only (not shared or client)
[ ] All referenced files exist on disk
[ ] dependency declared for required resources (ox_lib, oxmysql, es_extended, etc.)
[ ] No __resource.lua (deprecated — migrate to fxmanifest.lua)
[ ] No wildcard includes (*.lua) that could load injected files
[ ] nui_callback_strict_mode 'true' if NUI is used (build 9549+)
```

**Wildcard risk:**
```lua
-- RISKY: loads ANY .lua file, including injected backdoors
server_scripts { 'server/*.lua' }

-- SAFER: explicit file list
server_scripts {
    'server/main.lua',
    'server/commands.lua',
}
```

## 4.2 Framework Isolation (MEDIUM)

```
[ ] Framework code centralized in bridge.lua or bridge/ directory (not scattered)
[ ] Auto-detect pattern preferred over Config.Framework hard-coding
[ ] Bridge functions include input validation
[ ] pcall on framework initialization (graceful failure if framework missing)
[ ] No mixing of framework APIs (e.g., ESX + QBCore calls in same file)
[ ] Framework dependency declared in fxmanifest
```

Auto-detect pattern:
```lua
-- bridge/init.lua
local framework
if GetResourceState('es_extended') == 'started' then
    framework = 'esx'
elseif GetResourceState('qb-core') == 'started' then
    framework = 'qbcore'
elseif GetResourceState('ox_core') == 'started' then
    framework = 'ox'
elseif GetResourceState('ND_Core') == 'started' then
    framework = 'nd'
end

if not framework then
    print('[resource] No supported framework detected')
    return
end

-- Load framework-specific bridge
local bridge = require(('bridge.%s'):format(framework))
```

## 4.3 SQL Schema Files (MEDIUM)

```
[ ] No DROP TABLE in migration files (data loss risk)
[ ] No CREATE USER / GRANT statements (security misconfiguration)
[ ] No TRUNCATE TABLE without confirmation logic
[ ] Schema matches code expectations (column names, types)
[ ] AUTO_INCREMENT on primary keys
[ ] Appropriate indexes on frequently queried columns
[ ] CHARSET utf8mb4 for Unicode support
[ ] NOT NULL constraints where appropriate
[ ] DEFAULT values specified for optional columns
[ ] Foreign keys or application-level referential integrity
```

## 4.4 Lua Version Compatibility (LOW)

If `lua54 'yes'` is set:
```
[ ] No Lua 5.1-only patterns: unpack (use table.unpack), setfenv, getfenv
[ ] Integer division operator (//) used correctly
[ ] Bitwise operators (& | ~ << >>) used instead of bit32 library
[ ] goto/labels used appropriately
[ ] String library differences handled
```

If `lua54` is NOT set (Lua 5.1 mode):
```
[ ] No Lua 5.4 syntax used (integers, bitwise ops, goto)
[ ] Recommend enabling lua54 for performance benefits
```

## 4.5 Deprecated Patterns (LOW)

```
[ ] No TriggerEvent('esx:getSharedObject') — use exports
[ ] No QBCore:Server:UseItem — deprecated and exploitable
[ ] No __resource.lua — use fxmanifest.lua
[ ] No RegisterServerEvent (use RegisterNetEvent for net events)
[ ] No mysql-async raw calls if oxmysql available (performance)
[ ] No GetDistanceBetweenCoords (use vector math: #(v1 - v2))
[ ] No Citizen.CreateThread (use CreateThread)
[ ] No Citizen.Wait (use Wait)
[ ] No msgpack.unpack for event data (automatic since recent builds)
```

## 4.6 Resource Dependencies (LOW)

```
[ ] All used exports have corresponding dependency in fxmanifest
[ ] Optional dependencies checked with GetResourceState before use
[ ] Circular dependencies avoided
[ ] Minimum resource version specified if API changed between versions
```
