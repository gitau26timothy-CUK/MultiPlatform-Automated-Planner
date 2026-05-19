--[[
  MpAp JSON Library
  Simple JSON encode/decode for Lua
]]

local JSON = {}

-- Encode Lua table to JSON string
function JSON.stringify(obj)
  local t = type(obj)
  
  if t == "nil" then
    return "null"
  elseif t == "boolean" then
    return obj and "true" or "false"
  elseif t == "number" then
    return tostring(obj)
  elseif t == "string" then
    return "\"" .. obj:gsub("\\", "\\\\")
                       :gsub("\"", "\\\"")
                       :gsub("\b", "\\b")
                       :gsub("\f", "\\f")
                       :gsub("\n", "\\n")
                       :gsub("\r", "\\r")
                       :gsub("\t", "\\t")
                       .. "\""
  elseif t == "table" then
    local isArray = true
    local maxIndex = 0
    
    for k, v in pairs(obj) do
      if type(k) ~= "number" or k < 1 or math.floor(k) ~= k then
        isArray = false
        break
      end
      maxIndex = math.max(maxIndex, k)
    end
    
    if isArray and maxIndex > 0 then
      -- Encode as array
      local parts = {}
      for i = 1, maxIndex do
        table.insert(parts, JSON.stringify(obj[i]))
      end
      return "[" .. table.concat(parts, ",") .. "]"
    else
      -- Encode as object
      local parts = {}
      for k, v in pairs(obj) do
        table.insert(parts, JSON.stringify(tostring(k)) .. ":" .. JSON.stringify(v))
      end
      return "{" .. table.concat(parts, ",") .. "}"
    end
  end
  
  return "null"
end

-- Decode JSON string to Lua table
function JSON.parse(str)
  if not str or str == "" then
    return nil
  end
  
  -- Simple recursive descent parser
  local pos = 1
  
  local function skipWhitespace()
    while pos <= #str and str:sub(pos, pos):match("%s") do
      pos = pos + 1
    end
  end
  
  local function parseValue()
    skipWhitespace()
    
    if pos > #str then
      return nil
    end
    
    local char = str:sub(pos, pos)
    
    if char == "{" then
      return parseObject()
    elseif char == "[" then
      return parseArray()
    elseif char == "\"" then
      return parseString()
    elseif char == "t" and str:sub(pos, pos + 3) == "true" then
      pos = pos + 4
      return true
    elseif char == "f" and str:sub(pos, pos + 4) == "false" then
      pos = pos + 5
      return false
    elseif char == "n" and str:sub(pos, pos + 3) == "null" then
      pos = pos + 4
      return nil
    elseif char:match("[%d%-]") then
      return parseNumber()
    end
    
    return nil
  end
  
  local function parseObject()
    local obj = {}
    pos = pos + 1 -- skip {
    skipWhitespace()
    
    if str:sub(pos, pos) == "}" then
      pos = pos + 1
      return obj
    end
    
    while true do
      skipWhitespace()
      local key = parseString()
      skipWhitespace()
      
      if str:sub(pos, pos) ~= ":" then
        return nil
      end
      pos = pos + 1
      
      local value = parseValue()
      obj[key] = value
      
      skipWhitespace()
      local nextChar = str:sub(pos, pos)
      pos = pos + 1
      
      if nextChar == "}" then
        break
      elseif nextChar ~= "," then
        return nil
      end
    end
    
    return obj
  end
  
  local function parseArray()
    local arr = {}
    pos = pos + 1 -- skip [
    skipWhitespace()
    
    if str:sub(pos, pos) == "]" then
      pos = pos + 1
      return arr
    end
    
    while true do
      local value = parseValue()
      table.insert(arr, value)
      
      skipWhitespace()
      local nextChar = str:sub(pos, pos)
      pos = pos + 1
      
      if nextChar == "]" then
        break
      elseif nextChar ~= "," then
        return nil
      end
    end
    
    return arr
  end
  
  local function parseString()
    pos = pos + 1 -- skip opening quote
    local result = ""
    
    while pos <= #str do
      local char = str:sub(pos, pos)
      
      if char == "\"" then
        pos = pos + 1
        return result
      elseif char == "\\" then
        pos = pos + 1
        local nextChar = str:sub(pos, pos)
        
        if nextChar == "n" then
          result = result .. "\n"
        elseif nextChar == "t" then
          result = result .. "\t"
        elseif nextChar == "r" then
          result = result .. "\r"
        elseif nextChar == "b" then
          result = result .. "\b"
        elseif nextChar == "f" then
          result = result .. "\f"
        else
          result = result .. nextChar
        end
        
        pos = pos + 1
      else
        result = result .. char
        pos = pos + 1
      end
    end
    
    return result
  end
  
  local function parseNumber()
    local start = pos
    
    if str:sub(pos, pos) == "-" then
      pos = pos + 1
    end
    
    while pos <= #str and str:sub(pos, pos):match("%d") do
      pos = pos + 1
    end
    
    if str:sub(pos, pos) == "." then
      pos = pos + 1
      while pos <= #str and str:sub(pos, pos):match("%d") do
        pos = pos + 1
      end
    end
    
    if str:sub(pos, pos):lower() == "e" then
      pos = pos + 1
      if str:sub(pos, pos) == "-" or str:sub(pos, pos) == "+" then
        pos = pos + 1
      end
      while pos <= #str and str:sub(pos, pos):match("%d") do
        pos = pos + 1
      end
    end
    
    local numStr = str:sub(start, pos - 1)
    return tonumber(numStr)
  end
  
  return parseValue()
end

return JSON
