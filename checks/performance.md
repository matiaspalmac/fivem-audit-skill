# Phase 2: Performance Checks

## 2.1 Thread Analysis (HIGH)

```
[ ] No unconditional Wait(0) loops (while true do Wait(0) without condition)
[ ] Wait(0) only when feature is actively being used, Wait(500)+ when idle
[ ] Key polling replaced with RegisterKeyMapping
[ ] Two-tier pattern: Wait(1000) scanning → Wait(0) only near target
[ ] DrawMarker loops replaced with ox_target / lib.zones / lib.points
[ ] No nested Wait(0) loops (loop inside loop)
[ ] CreateThread count reasonable (not creating threads inside loops)
```

| Pattern | Verdict | Impact |
|---------|---------|--------|
| `while true do Wait(0)` unconditional | CRITICAL | ~0.3ms/frame constant |
| `Wait(0)` with active-state guard | GOOD | Only costs when needed |
| `Wait(100-500)` | ACCEPTABLE | Minimal impact |
| `Wait(1000)` | EXCELLENT | Negligible |
| `lib.waitFor` with timeout | EXCELLENT | Self-cleaning |

Two-tier pattern example:
```lua
CreateThread(function()
    while true do
        local sleep = 1000
        local ped = cache.ped or PlayerPedId()
        local coords = GetEntityCoords(ped)
        local dist = #(coords - targetCoords)
        if dist < 50.0 then
            sleep = 0
            -- draw/interact logic
        end
        Wait(sleep)
    end
end)
```

## 2.2 Native Caching (MEDIUM)

```
[ ] PlayerPedId() cached per-frame or per-tick (not called multiple times in same frame)
[ ] PlayerId() cached (not called every frame)
[ ] GetHashKey() cached for static strings (use `joaat` or pre-computed hashes)
[ ] lib.cache.ped / lib.cache.playerId used if ox_lib available
[ ] GetEntityCoords() not called multiple times for same entity in same frame
[ ] GetGameTimer() cached if used multiple times per frame
```

Caching pattern:
```lua
-- BAD: called every frame
CreateThread(function()
    while true do
        local ped = PlayerPedId()       -- redundant per-frame call
        local coords = GetEntityCoords(ped)
        -- use coords...
        local coords2 = GetEntityCoords(PlayerPedId()) -- called AGAIN
        Wait(0)
    end
end)

-- GOOD: cached
local ped, coords
CreateThread(function()
    while true do
        ped = cache.ped or PlayerPedId()
        coords = GetEntityCoords(ped)
        -- use coords and ped throughout frame
        Wait(0)
    end
end)
```

## 2.3 Database Optimization (MEDIUM)

```
[ ] No N+1 queries (SELECT inside a for loop — use WHERE IN or JOIN)
[ ] DB results cached with TTL (2-5s for frequently accessed data)
[ ] Batch operations use transactions (BEGIN/COMMIT)
[ ] INSERT/UPDATE use bulk syntax when processing multiple rows
[ ] SELECT only needed columns (not SELECT *)
[ ] Indexes exist for WHERE/JOIN columns (check .sql files)
[ ] Connection pool not exhausted (no dangling async queries)
[ ] MySQL.ready() or equivalent checked before queries on resource start
```

N+1 fix:
```lua
-- BAD: N+1
for _, player in pairs(players) do
    local result = MySQL.query.await("SELECT * FROM users WHERE id = ?", { player.id })
end

-- GOOD: single query
local ids = table.concat(playerIds, ',')
local results = MySQL.query.await("SELECT * FROM users WHERE id IN (?)", { ids })
```

## 2.4 Streaming Assets (MEDIUM)

```
[ ] RequestModel → SetModelAsNoLongerNeeded after use
[ ] RequestAnimDict → RemoveAnimDict after use
[ ] RequestAnimSet → RemoveAnimSet after use
[ ] RequestNamedPtfxAsset → RemoveNamedPtfxAsset after use
[ ] RequestScaleformMovie → SetScaleformMovieAsNoLongerNeeded after use
[ ] HasModelLoaded / HasAnimDictLoaded with timeout (not infinite Wait(0))
[ ] Streaming requests not inside tight loops
[ ] Texture dictionaries released after use
```

Timeout pattern:
```lua
local function loadModel(hash)
    RequestModel(hash)
    local timeout = 500
    while not HasModelLoaded(hash) and timeout > 0 do
        timeout = timeout - 1
        Wait(0)
    end
    if timeout <= 0 then
        -- model failed to load, handle gracefully
        return false
    end
    return true
end
-- After using the model:
SetModelAsNoLongerNeeded(hash)
```

## 2.5 Network Optimization (MEDIUM)

```
[ ] TriggerClientEvent(-1) minimized — use targeted player IDs or state bags
[ ] TriggerLatentClientEvent for payloads > 32KB (prevents network congestion)
[ ] Blips created once and updated, not recreated in loops
[ ] SendNUIMessage throttled with change detection (not every frame)
[ ] State bags preferred over frequent TriggerClientEvent for synced data
[ ] TriggerServerEvent not called from tight loops (rate limit client-side)
[ ] Large data synced via latent events or broken into chunks
```

## 2.6 Entity & Object Management (LOW)

```
[ ] Spawned entities tracked and deleted when no longer needed
[ ] Props cleaned up on resource stop
[ ] Particle effects stopped when complete
[ ] Temporary vehicles/peds deleted after use
[ ] Object pools not growing unbounded
```
