// Placeholder for Launch Configuration entity implementation

class LaunchConfiguration {
  constructor(name, type, request, programArguments) {
    this.name = name;
    this.type = type;
    this.request = request; // e.g., 'launch', 'attach'
    this.programArguments = programArguments;
  }

  // Add methods for launch configuration management here
}

module.exports = LaunchConfiguration;
