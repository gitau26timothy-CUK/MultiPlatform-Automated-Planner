--[[
  MpAp SQLite Library
  Cross-platform SQLite wrapper for Lua
  
  Uses native SQLite bindings or falls back to file-based storage
]]

local sqlite3 = require("lsqlite3") or require("sqlite3")

local SQLite = {}
SQLite.__index = SQLite

function SQLite.open(path)
  local self = setmetatable({}, SQLite)
  
  if sqlite3 then
    self.db = sqlite3.open(path)
  else
    -- Fallback: file-based JSON storage
    self.fallbackPath = path:gsub("%.db$", ".json")
    self.fallbackData = { tasks = {}, events = {}, devices = {} }
    self:loadFallback()
  end
  
  return self
end

-- Fallback storage (when native SQLite unavailable)
function SQLite:loadFallback()
  local file = io.open(self.fallbackPath, "r")
  if file then
    local content = file:read("*all")
    file:close()
    
    local ok, data = pcall(function()
      return require("libs.json").parse(content)
    end)
    
    if ok and data then
      self.fallbackData = data
    end
  end
end

function SQLite:saveFallback()
  local file = io.open(self.fallbackPath, "w")
  if file then
    file:write(require("libs.json").stringify(self.fallbackData))
    file:close()
  end
end

function SQLite:exec(sql)
  if self.db then
    return self.db:exec(sql)
  else
    -- Fallback: parse basic SQL and simulate
    return self:simulateSQL(sql)
  end
end

function SQLite:query(sql)
  if self.db then
    local results = {}
    for row in self.db:nrows(sql) do
      table.insert(results, row)
    end
    return results
  else
    return self:simulateQuery(sql)
  end
end

function SQLite:simulateSQL(sql)
  -- Very basic SQL simulation for fallback mode
  -- In production, always use native SQLite
  
  sql = sql:lower()
  
  -- Extract table name
  local tableName = sql:match("into%s+(\w+)") or 
                    sql:match("update%s+(\w+)") or
                    sql:match("from%s+(\w+)") or
                    sql:match("delete%s+from%s+(\w+)")
  
  if sql:find("insert") then
    -- Parse INSERT values
    local values = {}
    for v in sql:gmatch("'([^']*)'") do
      table.insert(values, v)
    end
    
    if tableName and self.fallbackData[tableName] then
      table.insert(self.fallbackData[tableName], values)
      self:saveFallback()
    end
    
  elseif sql:find("update") then
    -- Parse UPDATE
    local setClause = sql:match("set%s+(.-)%s+where")
    local whereClause = sql:match("where%s+(.-)$")
    
    -- Simplified: just resave
    self:saveFallback()
    
  elseif sql:find("delete") then
    -- Parse DELETE
    local whereClause = sql:match("where%s+(.-)$")
    
    -- Simplified
    self:saveFallback()
  end
  
  return 0
end

function SQLite:simulateQuery(sql)
  sql = sql:lower()
  local tableName = sql:match("from%s+(\w+)")
  
  if tableName and self.fallbackData[tableName] then
    local results = {}
    for i, row in ipairs(self.fallbackData[tableName]) do
      local mapped = { id = i }
      -- Map array to named fields based on table
      if tableName == "tasks" then
        mapped.title = row[1]
        mapped.tag = row[2]
        mapped.priority = row[3]
        mapped.due = row[4]
        mapped.progress = row[5]
        mapped.col = row[6]
        mapped.avatars = row[7]
        mapped.alarm = row[8]
        mapped.ord = row[9]
      end
      table.insert(results, mapped)
    end
    return results
  end
  
  return {}
end

function SQLite:close()
  if self.db then
    self.db:close()
  else
    self:saveFallback()
  end
end

return SQLite
