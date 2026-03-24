# Phase 3: Cleanup & Stability Checks

## 3.1 playerDropped Handler (HIGH)

MUST exist if the server script maintains any per-player state. Missing cleanup causes memory leaks and stale data.

```
[ ] Handler exists: AddEventHandler('playerDropped', function(reason) ... end)
[ ] Cleans cooldown/rate limit tables (source-keyed)
[ ] Cleans mutex/lock tables
[ ] Cleans session/tracking data
[ ] Cleans inventory access locks (stash/trunk)
[ ] Cleans voice/radio channel memberships
[ ] Cleans temporary permission grants
[ ] Cleans any player-indexed cache or state
[ ] Uses `source` inside handler (not a variable from outer scope)
```

Pattern:
```lua
AddEventHandler('playerDropped', function(reason)
    local src = source
    cooldowns[src] = nil
    locks[src] = nil
    sessions[src] = nil
    stashAccess[src] = nil
    -- clean ALL source-keyed tables
end)
```

**Common mistake — forgetting tables:**
Search for all tables indexed by player source (`[src]`, `[source]`, `[playerId]`) in server files. Every one must be cleaned in playerDropped.

## 3.2 onResourceStop Handler (HIGH)

MUST exist if the client script modifies game state. Missing cleanup causes ghost effects after resource restart.

```
[ ] Handler exists: AddEventHandler('onResourceStop', function(resource) ... end)
[ ] Checks resource name matches: if resource ~= GetCurrentResourceName() then return end
[ ] SetNuiFocus(false, false) — release NUI cursor
[ ] FreezeEntityPosition(ped, false) — unfreeze player
[ ] RenderScriptCams(false) — restore camera
[ ] DeleteEntity on spawned props/peds/vehicles
[ ] ClearPedTasks(ped) — clear animations
[ ] HUD/visibility restored (SetEntityVisible, ResetEntityAlpha)
[ ] Invincibility removed (SetEntityInvincible(ped, false))
[ ] Streaming assets released (SetModelAsNoLongerNeeded)
[ ] ox_target zones removed (exports.ox_target:removeZone)
[ ] lib.zones cleanup (zone:remove())
[ ] Blips removed (RemoveBlip)
[ ] Text UI hidden
[ ] Screen effects cleared (AnimpostfxStop)
[ ] Disable control actions restored
```

Pattern:
```lua
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    local ped = PlayerPedId()
    SetNuiFocus(false, false)
    FreezeEntityPosition(ped, false)
    RenderScriptCams(false, false, 0, true, true)
    ClearPedTasks(ped)
    -- delete all spawned entities
    for _, entity in pairs(spawnedEntities) do
        if DoesEntityExist(entity) then
            DeleteEntity(entity)
        end
    end
    -- remove all zones/targets
    for _, zone in pairs(zones) do
        zone:remove()
    end
end)
```

## 3.3 Memory Leak Prevention (MEDIUM)

```
[ ] No event handlers registered INSIDE callbacks (causes handler stacking)
[ ] Source-keyed tables cleaned on playerDropped (see 3.1)
[ ] No unbounded table growth (tables that grow but never shrink)
[ ] Timers/intervals cleaned up when no longer needed
[ ] Closures don't capture large data unnecessarily
```

Event stacking example:
```lua
-- BAD: registers new handler every time event fires
RegisterNetEvent('resource:open', function()
    RegisterNetEvent('resource:action', function() -- STACKS on each open!
        -- ...
    end)
end)

-- GOOD: register once at top level
RegisterNetEvent('resource:action', function()
    -- ...
end)
```

## 3.4 Error Resilience (MEDIUM)

```
[ ] DB calls wrapped in pcall or use .await with error handling
[ ] Cross-resource exports wrapped in pcall
[ ] GetResourceState() checked before calling exports
[ ] json.decode wrapped in pcall (malformed JSON crashes resource)
[ ] PerformHttpRequest callbacks handle nil/error responses
[ ] Math operations check for nil/NaN before computation
[ ] Table access uses nil-safe patterns (t and t.key)
```

Pattern:
```lua
-- Safe export call
local function safeExport(resource, export, ...)
    if GetResourceState(resource) ~= 'started' then return nil end
    local ok, result = pcall(exports[resource][export], ...)
    if not ok then
        print(('[%s] Export %s:%s failed: %s'):format(GetCurrentResourceName(), resource, export, result))
        return nil
    end
    return result
end

-- Safe JSON decode
local function safeDecode(str)
    if not str or str == '' then return nil end
    local ok, data = pcall(json.decode, str)
    return ok and data or nil
end
```

## 3.5 Resource Restart Safety (LOW)

```
[ ] State persists correctly across resource restart (DB-backed, not memory-only)
[ ] Player state re-synced on resource start (not lost on restart)
[ ] NUI state reset on resource start
[ ] Timers don't create duplicate instances on restart
```
