const Task = require('../models/Task');
const Event = require('../models/Event');

class AIService {
  constructor() {
    this.commands = {
      'schedule': this.scheduleWeek.bind(this),
      'flag': this.flagOverdue.bind(this),
      'alarm': this.setAlarms.bind(this),
      'prioritise': this.prioritise.bind(this),
      'reschedule': this.reschedule.bind(this)
    };
  }

  // Parse AI command and execute
  async execute(command) {
    const lower = command.toLowerCase();
    let handler = null;

    for (const [key, fn] of Object.entries(this.commands)) {
      if (lower.includes(key)) {
        handler = fn;
        break;
      }
    }

    if (!handler) {
      return { success: false, message: `Unknown command: "${command}". Try: schedule, flag, alarm, prioritise, reschedule` };
    }

    try {
      return await handler(command);
    } catch (err) {
      return { success: false, message: `Error: ${err.message}` };
    }
  }

  // Auto-schedule the week
  async scheduleWeek() {
    const tasks = await Task.find({ userId: 'default', column: { $lt: 3 } });
    const high = tasks.filter(t => t.priority === 'high');
    const mid = tasks.filter(t => t.priority === 'mid');
    const low = tasks.filter(t => t.priority === 'low');

    // Move high priority to "In Progress"
    for (const t of high) {
      if (t.column < 2) {
        t.column = 2;
        await t.save();
      }
    }

    // Move mid priority to "To Do"
    for (const t of mid) {
      if (t.column === 0) {
        t.column = 1;
        await t.save();
      }
    }

    return {
      success: true,
      message: `Scheduled: ${high.length} high-priority → In Progress, ${mid.length} mid → To Do, ${low.length} low remain in Backlog`,
      affected: high.length + mid.length
    };
  }

  // Flag all overdue tasks
  async flagOverdue() {
    const tasks = await Task.find({ userId: 'default', column: { $lt: 3 } });
    let flagged = 0;

    for (const t of tasks) {
      const due = t.due.toLowerCase();
      if (due === 'today' || due === 'overdue') {
        t.priority = 'high';
        t.alarm = true;
        await t.save();
        flagged++;
      }
    }

    return {
      success: true,
      message: `Flagged ${flagged} overdue tasks as HIGH priority with alarms enabled`,
      affected: flagged
    };
  }

  // Set alarms for all deadline tasks
  async setAlarms() {
    const tasks = await Task.find({
      userId: 'default',
      tag: { $in: ['deadline', 'assignment'] },
      column: { $lt: 3 },
      alarm: false
    });

    for (const t of tasks) {
      t.alarm = true;
      await t.save();
    }

    return {
      success: true,
      message: `Alarms set for ${tasks.length} deadline/assignment tasks across all devices`,
      affected: tasks.length
    };
  }

  // Prioritise tasks by due date
  async prioritise() {
    const tasks = await Task.find({ userId: 'default', column: { $lt: 3 } });
    const today = new Date();

    for (const t of tasks) {
      if (t.due.toLowerCase() === 'today') {
        t.priority = 'high';
      } else if (t.due !== 'TBD') {
        t.priority = 'mid';
      }
      await t.save();
    }

    return {
      success: true,
      message: `Prioritised ${tasks.length} tasks by due date`,
      affected: tasks.length
    };
  }

  // Reschedule overdue to next available slot
  async reschedule() {
    const tasks = await Task.find({ userId: 'default', column: { $lt: 3 } });
    let rescheduled = 0;

    for (const t of tasks) {
      if (t.due.toLowerCase() === 'today' || t.due.toLowerCase() === 'overdue') {
        const next = new Date();
        next.setDate(next.getDate() + 3);
        t.due = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        t.priority = 'mid';
        await t.save();
        rescheduled++;
      }
    }

    return {
      success: true,
      message: `Rescheduled ${rescheduled} overdue tasks to +3 days`,
      affected: rescheduled
    };
  }
}

module.exports = new AIService();
