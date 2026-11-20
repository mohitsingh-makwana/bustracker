
-- KEYS[1] = live-location JSON key
-- KEYS[2] = accepted capture-timestamp key
--
-- ARGV[1] = incoming capture timestamp in epoch milliseconds
-- ARGV[2] = serialized LiveLocationResponse JSON
-- ARGV[3] = TTL in seconds
--
-- Return values:
--  1 = location accepted and updated
--  0 = older or duplicate timestamp; update ignored
-- -1 = inconsistent Redis keys or missing timestamp metadata
-- -2 = invalid timestamp or TTL metadata

local incomingTimestamp = tonumber(ARGV[1])
local ttlSeconds = tonumber(ARGV[3])

if not incomingTimestamp or not ttlSeconds or ttlSeconds <= 0 then
    return -2
end

local locationExists = redis.call('EXISTS', KEYS[1])
local timestampExists = redis.call('EXISTS', KEYS[2])

-- Neither key exists: initialize the first location.
if locationExists == 0 and timestampExists == 0 then
    redis.call('SET', KEYS[1], ARGV[2], 'EX', ttlSeconds)
    redis.call('SET', KEYS[2], ARGV[1], 'EX', ttlSeconds)
    return 1
end

-- One key exists without the other: don't guess which
-- location is newer or silently reset the timestamp history.
if locationExists ~= timestampExists then
    return -1
end

local storedTimestamp = redis.call('GET', KEYS[2])
local existingTimestamp = tonumber(storedTimestamp)

if not existingTimestamp then
    return -2
end

-- Reject older and duplicate readings.
if incomingTimestamp <= existingTimestamp then
    return 0
end

-- Accept the newer location and refresh both TTLs.
redis.call('SET', KEYS[1], ARGV[2], 'EX', ttlSeconds)
redis.call('SET', KEYS[2], ARGV[1], 'EX', ttlSeconds)

return 1
