--[[
  MpAp AutoOrganizer Server
  Multiplatform Automated Planner with Bluetooth Sync
  
  Architecture (Unified Remote style):
  - Desktop server knows all tasks
  - Bluetooth/WiFi transport to mobile clients
  - Server pushes full state on connect
  - Real-time sync on task changes
]]

local server = libs.server;
local bt = libs.bluetooth;
local sqlite = libs.sqlite;
local timer = libs.timer;
local utf8 = libs.utf8;
local json = libs.json;

-- State
local db = nil;
local connectedDevices = {};
local tasks = {};
local events = {};
local syncTimer = nil;
local btServer = nil;

-- Column names for UI
local COLUMNS = {
  [0] = "BACKLOG",
  [1] = "TO DO", 
  [2] = "IN PROGRESS",
  [3] = "DONE"
};

-- ============================================================================
-- DATABASE
-- ============================================================================

local function initDatabase()
  local dbPath = server.get("storage") .. "/mpap.db";
  db = sqlite.open(dbPath);
  
  -- Create tables
  db:exec([[
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      tag TEXT DEFAULT 'project',
      priority TEXT DEFAULT 'mid',
      due TEXT DEFAULT 'TBD',
      progress INTEGER DEFAULT 0,
      col INTEGER DEFAULT 0,
      avatars TEXT DEFAULT '["AK"]',
      alarm INTEGER DEFAULT 0,
      ord INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      date TEXT,
      duration TEXT,
      source TEXT DEFAULT 'manual',
      color TEXT DEFAULT '#7c3aed',
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'other',
      address TEXT UNIQUE,
      signal INTEGER DEFAULT 4,
      last_sync DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  ]]);
  
  -- Seed data if empty
  local count = db:query("SELECT COUNT(*) as c FROM tasks")[1].c;
  if count == 0 then
    seedData();
  end
  
  loadData();
end

local function seedData()
  local now = os.date("%Y-%m-%d %H:%M:%S");
  
  -- Seed tasks
  local taskData = {
    {"Literature review — AI Ethics paper", "assignment", "mid", "May 3", 15, 0, '["AK"]', 0, 0},
    {"Setup DeFi staking strategy", "crypto", "crypto", "May 5", 0, 0, '["AK"]', 0, 1},
    {"Quantum Computing pset 4", "assignment", "high", "Apr 29", 40, 1, '["AK","TM"]', 1, 0},
    {"Research proposal draft v2", "project", "mid", "Apr 30", 65, 1, '["AK","JL"]', 0, 1},
    {"Solidity smart contract audit", "crypto", "low", "May 2", 20, 1, '["AK"]', 0, 2},
    {"STEM Lab Report — Physics 301", "deadline", "high", "TODAY", 80, 2, '["AK"]', 1, 0},
    {"Protein folding simulation run", "project", "mid", "Apr 30", 55, 2, '["AK","MR"]', 0, 1},
    {"ETH portfolio rebalancing", "crypto", "crypto", "Apr 28", 70, 2, '["AK"]', 0, 2},
    {"Midterm study plan", "assignment", "low", "Apr 25", 100, 3, '["AK"]', 0, 0},
    {"BTC DCA schedule setup", "crypto", "crypto", "Apr 26", 100, 3, '["AK"]', 0, 1}
  };
  
  for _, t in ipairs(taskData) do
    db:exec(string.format([[
      INSERT INTO tasks (title, tag, priority, due, progress, col, avatars, alarm, ord)
      VALUES ('%s', '%s', '%s', '%s', %d, %d, '%s', %d, %d)
    ]], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9]));
  end
  
  -- Seed events
  local eventData = {
    {"ML Lecture — Room 3B", "09:00", "#7c3aed", "90min · Google Cal"},
    {"Lab Report Deadline", "11:30", "#ef4444", "URGENT · 2h remaining"},
    {"STEM Group Sync", "14:00", "#10b981", "Zoom · 1h"},
    {"BTC/ETH Portfolio Review", "17:00", "#f59e0b", "Crypto · self-scheduled"},
    {"Study Block", "20:00", "#00d4ff", "Auto-blocked · 2h"}
  };
  
  for _, e in ipairs(eventData) do
    db:exec(string.format([[
      INSERT INTO events (title, time, color, detail)
      VALUES ('%s', '%s', '%s', '%s')
    ]], e[1], e[2], e[3], e[4]));
  end
end

local function loadData()
  tasks = db:query("SELECT * FROM tasks ORDER BY col, ord");
  events = db:query("SELECT * FROM events ORDER BY time");
  
  -- Parse avatars JSON
  for _, t in ipairs(tasks) do
    t.avatars = json.parse(t.avatars);
    t.alarm = t.alarm == 1;
  end
end

local function saveTask(task)
  local avatarsJson = json.stringify(task.avatars);
  local alarmInt = task.alarm and 1 or 0;
  
  if task.id then
    db:exec(string.format([[
      UPDATE tasks SET
        title = '%s', tag = '%s', priority = '%s', due = '%s',
        progress = %d, col = %d, avatars = '%s', alarm = %d, ord = %d,
        updated_at = datetime('now')
      WHERE id = %d
    ]], task.title, task.tag, task.priority, task.due,
       task.progress, task.col, avatarsJson, alarmInt, task.ord, task.id));
  else
    local result = db:query(string.format([[
      INSERT INTO tasks (title, tag, priority, due, progress, col, avatars, alarm, ord)
      VALUES ('%s', '%s', '%s', '%s', %d, %d, '%s', %d, %d);
      SELECT last_insert_rowid() as id;
    ]], task.title, task.tag, task.priority, task.due,
       task.progress, task.col, avatarsJson, alarmInt, task.ord));
    task.id = result[1].id;
  end
  
  loadData();
  broadcastTaskUpdate(task);
end

local function deleteTask(id)
  db:exec("DELETE FROM tasks WHERE id = " .. id);
  loadData();
  broadcastTaskDelete(id);
end

-- ============================================================================
-- BLUETOOTH SYNC
-- ============================================================================

local function initBluetooth()
  -- Start Bluetooth server (simulated via socket for cross-platform)
  -- In production, this uses native Bluetooth RFCOMM
  local port = tonumber(server.get("port")) or 5544;
  
  btServer = bt.createServer(function(client)
    onDeviceConnect(client);
  end);
  
  btServer:start(port);
  server.update({ id = "bt-status", text = "BT Listening on " .. port });
end

local function onDeviceConnect(client)
  local deviceInfo = {
    id = client.id,
    name = client.name or "Unknown Device",
    type = client.type or "mobile",
    address = client.address,
    connectedAt = os.time()
  };
  
  table.insert(connectedDevices, deviceInfo);
  
  -- Register in DB
  db:exec(string.format([[
    INSERT OR REPLACE INTO devices (name, type, address, last_sync)
    VALUES ('%s', '%s', '%s', datetime('now'))
  ]], deviceInfo.name, deviceInfo.type, deviceInfo.address));
  
  -- Send full state to newly connected device
  pushFullState(client);
  updateDeviceList();
  
  -- Handle incoming messages
  client:on("data", function(data)
    onClientMessage(client, data);
  end);
  
  client:on("disconnect", function()
    onDeviceDisconnect(client);
  end);
end

local function onDeviceDisconnect(client)
  for i, d in ipairs(connectedDevices) do
    if d.id == client.id then
      table.remove(connectedDevices, i);
      break;
    end
  end
  updateDeviceList();
end

local function onClientMessage(client, data)
  local msg = json.parse(data);
  
  if msg.type == "sync:request" then
    pushFullState(client);
    
  elseif msg.type == "task:update" then
    saveTask(msg.task);
    
  elseif msg.type == "task:move" then
    local task = getTaskById(msg.taskId);
    if task then
      task.col = msg.newCol;
      saveTask(task);
    end
    
  elseif msg.type == "task:toggle-alarm" then
    local task = getTaskById(msg.taskId);
    if task then
      task.alarm = not task.alarm;
      saveTask(task);
    end
    
  elseif msg.type == "task:delete" then
    deleteTask(msg.taskId);
    
  elseif msg.type == "ai:command" then
    local result = executeAI(msg.command);
    client:send(json.stringify({
      type = "ai:result",
      result = result
    }));
  end
end

local function pushFullState(client)
  client:send(json.stringify({
    type = "sync:tasks",
    tasks = tasks
  }));
  
  client:send(json.stringify({
    type = "sync:events",
    events = events
  }));
  
  client:send(json.stringify({
    type = "sync:complete",
    timestamp = os.time(),
    deviceCount = #connectedDevices
  }));
end

local function broadcastTaskUpdate(task)
  local msg = json.stringify({
    type = "task:updated",
    task = task
  });
  
  for _, device in ipairs(connectedDevices) do
    if device.client then
      device.client:send(msg);
    end
  end
end

local function broadcastTaskDelete(taskId)
  local msg = json.stringify({
    type = "task:deleted",
    taskId = taskId
  });
  
  for _, device in ipairs(connectedDevices) do
    if device.client then
      device.client:send(msg);
    end
  end
end

local function updateDeviceList()
  local list = {};
  for _, d in ipairs(connectedDevices) do
    table.insert(list, {
      name = d.name,
      type = d.type,
      signal = d.signal or 4
    });
  end
  
  -- Update UI
  server.update({
    id = "device-count",
    text = tostring(#connectedDevices) .. " DEVICES"
  });
  
  -- Broadcast to all clients
  local msg = json.stringify({
    type = "devices:list",
    devices = list
  });
  
  for _, device in ipairs(connectedDevices) do
    if device.client then
      device.client:send(msg);
    end
  end
end

-- ============================================================================
-- AI COMMANDS
-- ============================================================================

local function executeAI(command)
  local cmd = utf8.lower(command);
  
  if utf8.indexof(cmd, "schedule") > -1 then
    return aiScheduleWeek();
    
  elseif utf8.indexof(cmd, "flag") > -1 then
    return aiFlagOverdue();
    
  elseif utf8.indexof(cmd, "alarm") > -1 then
    return aiSetAlarms();
    
  elseif utf8.indexof(cmd, "prioritise") > -1 or utf8.indexof(cmd, "prioritize") > -1 then
    return aiPrioritise();
    
  elseif utf8.indexof(cmd, "reschedule") > -1 then
    return aiReschedule();
    
  else
    return { success = false, message = "Unknown command: " .. command };
  end
end

local function aiScheduleWeek()
  local highCount = 0;
  local midCount = 0;
  
  for _, t in ipairs(tasks) do
    if t.col < 3 then
      if t.priority == "high" and t.col < 2 then
        t.col = 2; -- Move to In Progress
        saveTask(t);
        highCount = highCount + 1;
      elseif t.priority == "mid" and t.col == 0 then
        t.col = 1; -- Move to To Do
        saveTask(t);
        midCount = midCount + 1;
      end
    end
  end
  
  loadData();
  return {
    success = true,
    message = string.format("Scheduled: %d high → In Progress, %d mid → To Do", highCount, midCount),
    affected = highCount + midCount
  };
end

local function aiFlagOverdue()
  local flagged = 0;
  
  for _, t in ipairs(tasks) do
    local due = utf8.lower(t.due);
    if t.col < 3 and (due == "today" or due == "overdue") then
      t.priority = "high";
      t.alarm = true;
      saveTask(t);
      flagged = flagged + 1;
    end
  end
  
  loadData();
  return {
    success = true,
    message = "Flagged " .. flagged .. " overdue tasks as HIGH priority with alarms",
    affected = flagged
  };
end

local function aiSetAlarms()
  local count = 0;
  
  for _, t in ipairs(tasks) do
    if t.col < 3 and (t.tag == "deadline" or t.tag == "assignment") and not t.alarm then
      t.alarm = true;
      saveTask(t);
      count = count + 1;
    end
  end
  
  loadData();
  return {
    success = true,
    message = "Alarms set for " .. count .. " deadline/assignment tasks",
    affected = count
  };
end

local function aiPrioritise()
  for _, t in ipairs(tasks) do
    if t.col < 3 then
      local due = utf8.lower(t.due);
      if due == "today" then
        t.priority = "high";
      elseif due ~= "tbd" then
        t.priority = "mid";
      end
      saveTask(t);
    end
  end
  
  loadData();
  return {
    success = true,
    message = "Prioritised " .. #tasks .. " tasks by due date",
    affected = #tasks
  };
end

local function aiReschedule()
  local rescheduled = 0;
  
  for _, t in ipairs(tasks) do
    local due = utf8.lower(t.due);
    if t.col < 3 and (due == "today" or due == "overdue") then
      -- Set to +3 days
      local newDue = os.date("%b %d", os.time() + 3 * 24 * 60 * 60);
      t.due = newDue;
      t.priority = "mid";
      saveTask(t);
      rescheduled = rescheduled + 1;
    end
  end
  
  loadData();
  return {
    success = true,
    message = "Rescheduled " .. rescheduled .. " overdue tasks to +3 days",
    affected = rescheduled
  };
end

-- ============================================================================
-- HELPERS
-- ============================================================================

local function getTaskById(id)
  for _, t in ipairs(tasks) do
    if t.id == id then
      return t;
    end
  end
  return nil;
end

local function getColumnCount(col)
  local count = 0;
  for _, t in ipairs(tasks) do
    if t.col == col then
      count = count + 1;
    end
  end
  return count;
end

-- ============================================================================
-- EVENTS
-- ============================================================================

events.create = function ()
  initDatabase();
  initBluetooth();
  
  -- Update UI with initial data
  updateUI();
  
  -- Start periodic sync check
  syncTimer = timer.interval(function()
    checkOverdueAlarms();
  end, 60000); -- Check every minute
end

events.destroy = function ()
  if syncTimer then
    timer.cancel(syncTimer);
  end
  if btServer then
    btServer:stop();
  end
  if db then
    db:close();
  end
end

events.focus = function ()
  loadData();
  updateUI();
end

-- ============================================================================
-- UI UPDATE
-- ============================================================================

local function updateUI()
  -- Update task counts
  for col = 0, 3 do
    server.update({
      id = "count-" .. col,
      text = "(" .. getColumnCount(col) .. ")"
    });
  end
  
  -- Update device count
  server.update({
    id = "device-count",
    text = tostring(#connectedDevices) .. " DEVICES"
  });
  
  -- Update stats
  local active = 0;
  local overdue = 0;
  local completed = 0;
  
  for _, t in ipairs(tasks) do
    if t.col < 3 then
      active = active + 1;
      local due = utf8.lower(t.due);
      if due == "today" or due == "overdue" then
        overdue = overdue + 1;
      end
    else
      completed = completed + 1;
    end
  end
  
  server.update({ id = "stat-active", text = tostring(active) });
  server.update({ id = "stat-overdue", text = tostring(overdue) });
  server.update({ id = "stat-completed", text = tostring(completed) });
  server.update({ id = "stat-upcoming", text = tostring(active - overdue) });
end

local function checkOverdueAlarms()
  local overdue = {};
  
  for _, t in ipairs(tasks) do
    local due = utf8.lower(t.due);
    if t.alarm and t.col < 3 and (due == "today" or due == "overdue") then
      table.insert(overdue, t);
    end
  end
  
  if #overdue > 0 then
    -- Broadcast alarm notification
    local msg = json.stringify({
      type = "alarms:overdue",
      tasks = overdue
    });
    
    for _, device in ipairs(connectedDevices) do
      if device.client then
        device.client:send(msg);
      end
    end
    
    -- Show notification
    server.update({
      id = "notification",
      type = "dialog",
      title = "Overdue Tasks",
      text = "You have " .. #overdue .. " overdue tasks with active alarms"
    });
  end
end

-- ============================================================================
-- ACTIONS (UI callbacks)
-- ============================================================================

--@help Launch MpAp
events.launch = function ()
  -- Already running as server
  server.update({ id = "status", text = "Server Running" });
end

--@help Set alarms for overdue tasks
actions.setAlarms = function ()
  local result = aiSetAlarms();
  server.update({
    id = "notification",
    text = result.message
  });
  updateUI();
end

--@help Auto-schedule week
actions.scheduleWeek = function ()
  local result = aiScheduleWeek();
  server.update({
    id = "notification", 
    text = result.message
  });
  updateUI();
end

--@help Flag overdue tasks
actions.flagOverdue = function ()
  local result = aiFlagOverdue();
  server.update({
    id = "notification",
    text = result.message
  });
  updateUI();
end

--@help Execute AI command
--@param command:string AI command
actions.aiCommand = function (command)
  local result = executeAI(command);
  server.update({
    id = "ai-result",
    text = result.message
  });
  if result.success then
    updateUI();
  end
end

--@help Add new task
--@param title:string Task title
--@param col:number Column (0-3)
actions.addTask = function (title, col)
  local task = {
    title = title,
    tag = "project",
    priority = "mid",
    due = "TBD",
    progress = 0,
    col = col or 1,
    avatars = {"AK"},
    alarm = false,
    ord = getColumnCount(col or 1)
  };
  
  saveTask(task);
  updateUI();
  
  server.update({
    id = "notification",
    text = "Task created: " .. title
  });
end

--@help Move task to column
--@param taskId:number Task ID
--@param newCol:number Target column
actions.moveTask = function (taskId, newCol)
  local task = getTaskById(taskId);
  if task then
    task.col = newCol;
    task.ord = getColumnCount(newCol);
    saveTask(task);
    updateUI();
  end
end

--@help Toggle task alarm
--@param taskId:number Task ID
actions.toggleAlarm = function (taskId)
  local task = getTaskById(taskId);
  if task then
    task.alarm = not task.alarm;
    saveTask(task);
    
    server.update({
      id = "notification",
      text = task.alarm and ("Alarm set: " .. task.title) or ("Alarm removed: " .. task.title)
    });
  end
end

--@help Delete task
--@param taskId:number Task ID
actions.deleteTask = function (taskId)
  deleteTask(taskId);
  updateUI();
  server.update({
    id = "notification",
    text = "Task deleted"
  });
end

--@help Get all tasks
actions.getTasks = function ()
  return tasks;
end

--@help Get all events
actions.getEvents = function ()
  return events;
end

--@help Refresh data
actions.refresh = function ()
  loadData();
  updateUI();
end
