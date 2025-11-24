// languageServer.js
// Language Server implementation for enhanced IntelliSense

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', ':', '<', '"', '/', '@', '#']
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ',']
      },
      definitionProvider: true,
      referencesProvider: true,
      documentHighlightProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeActionProvider: true,
      codeLensProvider: {
        resolveProvider: true
      },
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      renameProvider: true,
      documentLinkProvider: {
        resolveProvider: true
      },
      colorProvider: true,
      foldingRangeProvider: true
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// C/C++ completions
const cCompletions = [
  { label: 'printf', kind: CompletionItemKind.Function, detail: 'Print formatted output', insertText: 'printf("${1:%s}\\n", ${2:var});' },
  { label: 'scanf', kind: CompletionItemKind.Function, detail: 'Read formatted input', insertText: 'scanf("%${1:d}", &${2:var});' },
  { label: 'malloc', kind: CompletionItemKind.Function, detail: 'Allocate memory', insertText: 'malloc(${1:size})' },
  { label: 'free', kind: CompletionItemKind.Function, detail: 'Free memory', insertText: 'free(${1:ptr})' },
  { label: 'for', kind: CompletionItemKind.Keyword, detail: 'For loop', insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}' },
  { label: 'while', kind: CompletionItemKind.Keyword, detail: 'While loop', insertText: 'while (${1:condition}) {\n\t${2}\n}' },
  { label: 'if', kind: CompletionItemKind.Keyword, detail: 'If statement', insertText: 'if (${1:condition}) {\n\t${2}\n}' },
  { label: 'struct', kind: CompletionItemKind.Keyword, detail: 'Structure definition', insertText: 'struct ${1:Name} {\n\t${2:int data;}\n};' },
  { label: 'include', kind: CompletionItemKind.Keyword, detail: 'Include header', insertText: '#include <${1:stdio}.h>' },
  { label: 'define', kind: CompletionItemKind.Keyword, detail: 'Define macro', insertText: '#define ${1:NAME} ${2:value}' }
];

// Python completions
const pythonCompletions = [
  { label: 'print', kind: CompletionItemKind.Function, detail: 'Print output', insertText: 'print(${1:value})' },
  { label: 'input', kind: CompletionItemKind.Function, detail: 'Read input', insertText: 'input(${1:"Enter: "})' },
  { label: 'len', kind: CompletionItemKind.Function, detail: 'Get length', insertText: 'len(${1:obj})' },
  { label: 'range', kind: CompletionItemKind.Function, detail: 'Range function', insertText: 'range(${1:n})' },
  { label: 'for', kind: CompletionItemKind.Keyword, detail: 'For loop', insertText: 'for ${1:i} in range(${2:n}):\n\t${3}' },
  { label: 'while', kind: CompletionItemKind.Keyword, detail: 'While loop', insertText: 'while ${1:condition}:\n\t${2}' },
  { label: 'if', kind: CompletionItemKind.Keyword, detail: 'If statement', insertText: 'if ${1:condition}:\n\t${2}' },
  { label: 'def', kind: CompletionItemKind.Keyword, detail: 'Function definition', insertText: 'def ${1:function_name}(${2:params}):\n\t${3}' },
  { label: 'class', kind: CompletionItemKind.Keyword, detail: 'Class definition', insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3}' },
  { label: 'import', kind: CompletionItemKind.Keyword, detail: 'Import module', insertText: 'import ${1:module}' }
];

// JavaScript completions
const jsCompletions = [
  { label: 'console.log', kind: CompletionItemKind.Function, detail: 'Log to console', insertText: 'console.log(${1:value});' },
  { label: 'function', kind: CompletionItemKind.Keyword, detail: 'Function declaration', insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}' },
  { label: 'const', kind: CompletionItemKind.Keyword, detail: 'Constant declaration', insertText: 'const ${1:name} = ${2:value};' },
  { label: 'let', kind: CompletionItemKind.Keyword, detail: 'Variable declaration', insertText: 'let ${1:name} = ${2:value};' },
  { label: 'for', kind: CompletionItemKind.Keyword, detail: 'For loop', insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}' },
  { label: 'if', kind: CompletionItemKind.Keyword, detail: 'If statement', insertText: 'if (${1:condition}) {\n\t${2}\n}' },
  { label: 'async', kind: CompletionItemKind.Keyword, detail: 'Async function', insertText: 'async function ${1:name}(${2:params}) {\n\t${3}\n}' },
  { label: 'await', kind: CompletionItemKind.Keyword, detail: 'Await expression', insertText: 'await ${1:promise}' },
  { label: 'import', kind: CompletionItemKind.Keyword, detail: 'Import statement', insertText: 'import ${1:module} from \'${2:path}\';' },
  { label: 'export', kind: CompletionItemKind.Keyword, detail: 'Export statement', insertText: 'export ${1:default} ${2:name};' }
];

// Provide completions based on language
connection.onCompletion(
  (_textDocumentPosition) => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) {
      return [];
    }

    const text = document.getText();
    const languageId = document.languageId;

    // Return completions based on language
    if (languageId === 'c' || languageId === 'cpp') {
      return cCompletions;
    } else if (languageId === 'python') {
      return pythonCompletions;
    } else if (languageId === 'javascript' || languageId === 'typescript') {
      return jsCompletions;
    }

    return [];
  }
);

// Resolve completion item details
connection.onCompletionResolve(
  (item) => {
    if (item.data === 1) {
      item.detail = 'TypeScript details';
      item.documentation = 'TypeScript documentation';
    }
    return item;
  }
);

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

console.log('Language Server started');
