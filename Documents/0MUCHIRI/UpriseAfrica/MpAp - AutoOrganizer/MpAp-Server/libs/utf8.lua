--[[
  MpAp UTF8 Library
  String manipulation utilities
]]

local UTF8 = {}

-- Convert string to lowercase
function UTF8.lower(str)
  return str:lower()
end

-- Find substring position
function UTF8.indexof(str, substr)
  local pos = str:find(substr, 1, true)
  return pos or -1
end

-- Get substring
function UTF8.sub(str, startPos, endPos)
  if endPos then
    return str:sub(startPos + 1, endPos)
  else
    return str:sub(startPos + 1)
  end
end

-- Split string by delimiter
function UTF8.split(str, delimiter)
  local result = {}
  local pattern = "([^" .. delimiter .. "]+)"
  
  for match in str:gmatch(pattern) do
    table.insert(result, match)
  end
  
  return result
end

-- Replace substring
function UTF8.replace(str, old, new)
  return str:gsub(old:gsub("[%-%.%+%[%]%(%)%$%^%%%?%*]", "%%%1"), new)
end

-- Get string length
function UTF8.len(str)
  return #str
end

-- Trim whitespace
function UTF8.trim(str)
  return str:match("^%s*(.-)%s*$")
end

-- Check if string starts with prefix
function UTF8.startswith(str, prefix)
  return str:sub(1, #prefix) == prefix
end

-- Check if string ends with suffix
function UTF8.endswith(str, suffix)
  return str:sub(-#suffix) == suffix
end

-- Join strings with separator
function UTF8.join(parts, separator)
  return table.concat(parts, separator)
end

return UTF8
