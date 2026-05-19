--[[
  MpAp Timer Library
  Cross-platform timer utilities
]]

local socket = require("socket")

local Timer = {}
local activeTimers = {}

-- Create a repeating interval timer
function Timer.interval(callback, ms)
  local timer = {
    callback = callback,
    interval = ms / 1000,
    running = true,
    lastTime = socket.gettime()
  }
  
  table.insert(activeTimers, timer)
  
  -- Return timer ID
  return #activeTimers
end

-- Create a one-shot timeout
function Timer.timeout(callback, ms)
  local timer = {
    callback = callback,
    timeout = ms / 1000,
    running = true,
    startTime = socket.gettime()
  }
  
  table.insert(activeTimers, timer)
  return #activeTimers
end

-- Cancel a timer
function Timer.cancel(timerId)
  if activeTimers[timerId] then
    activeTimers[timerId].running = false
  end
end

-- Process all timers (call in main loop)
function Timer.tick()
  local now = socket.gettime()
  
  for i = #activeTimers, 1, -1 do
    local timer = activeTimers[i]
    
    if not timer.running then
      table.remove(activeTimers, i)
      
    elseif timer.interval then
      -- Interval timer
      if now - timer.lastTime >= timer.interval then
        timer.lastTime = now
        timer.callback()
      end
      
    elseif timer.timeout then
      -- Timeout timer
      if now - timer.startTime >= timer.timeout then
        timer.running = false
        timer.callback()
        table.remove(activeTimers, i)
      end
    end
  end
end

-- Sleep (blocking)
function Timer.sleep(ms)
  socket.sleep(ms / 1000)
end

return Timer
