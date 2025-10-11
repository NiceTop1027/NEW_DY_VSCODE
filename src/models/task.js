// Placeholder for Task entity implementation

class Task {
  constructor(name, command, executionEnvironment) {
    this.name = name;
    this.command = command;
    this.executionEnvironment = executionEnvironment; // e.g., shell, process
    this.status = 'pending';
  }

  // Add methods for task management here
}

module.exports = Task;
