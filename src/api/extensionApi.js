// Placeholder for Extension API implementation

class ExtensionAPI {
  registerLanguageService(service) {
    console.log("Registering language service:", service.name);
  }

  registerTheme(theme) {
    console.log("Registering theme:", theme.name);
  }

  registerCommand(commandId, handler) {
    console.log("Registering command:", commandId);
  }

  registerUIContribution(contribution) {
    console.log("Registering UI contribution:", contribution.type);
  }
}

module.exports = ExtensionAPI;
