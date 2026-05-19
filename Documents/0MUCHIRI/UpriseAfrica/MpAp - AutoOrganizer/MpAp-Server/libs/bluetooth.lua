--[[
  MpAp Bluetooth Library
  Cross-platform Bluetooth wrapper for Lua
  
  Windows: Uses Windows Sockets (RFCOMM simulation)
  macOS/Linux: Uses BlueZ or socket-based communication
  
  This is a simplified version for the MpAp server
]]

local socket = require("socket")
local json = require("libs.json")

local Bluetooth = {}
Bluetooth.__index = Bluetooth

-- Server class
local Server = {}
Server.__index = Server

function Bluetooth.createServer(onConnect)
  local self = setmetatable({}, Server)
  self.onConnect = onConnect
  self.running = false
  self.server = nil
  self.clients = {}
  return self
end

function Server:start(port)
  port = port or 5544
  self.running = true
  
  -- Create TCP server (simulates Bluetooth RFCOMM)
  self.server = socket.bind("*", port)
  self.server:settimeout(0)
  
  print("[BT] Server listening on port " .. port)
  
  -- Accept connections in background
  self:acceptLoop()
end

function Server:acceptLoop()
  while self.running do
    local client = self.server:accept()
    if client then
      client:settimeout(0)
      local clientObj = self:wrapClient(client)
      table.insert(self.clients, clientObj)
      
      if self.onConnect then
        self.onConnect(clientObj)
      end
    end
    
    -- Process client data
    self:processClients()
    
    socket.sleep(0.01) -- 10ms tick
  end
end

function Server:wrapClient(sock)
  local client = {
    id = tostring(sock),
    socket = sock,
    name = "Device " .. #self.clients + 1,
    type = "mobile",
    address = sock:getpeername() or "unknown",
    buffer = ""
  }
  
  function client:send(data)
    if self.socket then
      self.socket:send(data .. "\n")
    end
  end
  
  function client:on(event, callback)
    if event == "data" then
      self._onData = callback
    elseif event == "disconnect" then
      self._onDisconnect = callback
    end
  end
  
  return client
end

function Server:processClients()
  for i = #self.clients, 1, -1 do
    local client = self.clients[i]
    if client.socket then
      local data, err = client.socket:receive(1024)
      
      if data then
        client.buffer = client.buffer .. data
        -- Process complete messages (newline delimited)
        while true do
          local newlinePos = client.buffer:find("\n")
          if not newlinePos then break end
          
          local msg = client.buffer:sub(1, newlinePos - 1)
          client.buffer = client.buffer:sub(newlinePos + 1)
          
          if client._onData then
            client._onData(msg)
          end
        end
      elseif err == "closed" then
        -- Client disconnected
        if client._onDisconnect then
          client._onDisconnect()
        end
        table.remove(self.clients, i)
      end
    end
  end
end

function Server:stop()
  self.running = false
  
  for _, client in ipairs(self.clients) do
    if client.socket then
      client.socket:close()
    end
  end
  
  if self.server then
    self.server:close()
  end
  
  print("[BT] Server stopped")
end

-- Client class (for connecting to server)
local Client = {}
Client.__index = Client

function Bluetooth.connect(address, port)
  port = port or 5544
  
  local sock = socket.connect(address, port)
  if not sock then
    return nil, "Connection failed"
  end
  
  sock:settimeout(0)
  
  local self = setmetatable({
    socket = sock,
    buffer = "",
    connected = true
  }, Client)
  
  return self
end

function Client:send(data)
  if self.connected and self.socket then
    self.socket:send(data .. "\n")
    return true
  end
  return false
end

function Client:receive()
  if not self.connected or not self.socket then
    return nil
  end
  
  local data, err = self.socket:receive(1024)
  
  if data then
    self.buffer = self.buffer .. data
    local newlinePos = self.buffer:find("\n")
    if newlinePos then
      local msg = self.buffer:sub(1, newlinePos - 1)
      self.buffer = self.buffer:sub(newlinePos + 1)
      return msg
    end
  elseif err == "closed" then
    self.connected = false
    return nil
  end
  
  return nil
end

function Client:close()
  self.connected = false
  if self.socket then
    self.socket:close()
  end
end

-- Export
return Bluetooth
