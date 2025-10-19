import { languages } from "monaco-editor";
import IMonarchLanguage = languages.IMonarchLanguage;

export const definePlantUmlLanguage = (monaco: any) => {
  // Only define if it hasn't been defined already
  if (
    monaco.languages.getLanguages().some((lang: any) => lang.id === "plantuml")
  ) {
    return;
  }

  monaco.languages.register({ id: "plantuml" });

  monaco.languages.setMonarchTokensProvider("plantuml", plantUmlTokenProvider);

  // Add PlantUML completions
  monaco.languages.registerCompletionItemProvider("plantuml", {
    provideCompletionItems: () => {
      const suggestions = [
        {
          label: "@startuml",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "@startuml\n\n@enduml",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Start a PlantUML diagram",
        },
        {
          label: "class",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "class ${1:ClassName} {\n\t${2:+attribute: type}\n}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a class",
        },
        {
          label: "interface",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText:
            "interface ${1:InterfaceName} {\n\t${2:+method(): returnType}\n}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define an interface",
        },
        {
          label: "enum",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "enum ${1:EnumName} {\n\t${2:VALUE1}\n\t${3:VALUE2}\n}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define an enumeration",
        },
        {
          label: "note",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "note ${1:left} of ${2:ClassName} : ${3:Note text}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Add a note to a class",
        },
        {
          label: "relationship",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            '${1:Class1} ${2:"*"} -- ${3:"1"} ${4:Class2} : ${5:belongs to}',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create a relationship between classes",
        },
        {
          label: "inheritance",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "${1:ChildClass} --|> ${2:ParentClass}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create an inheritance relationship",
        },
        {
          label: "composition",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "${1:Container} *-- ${2:Contained}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create a composition relationship",
        },
        {
          label: "aggregation",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "${1:Container} o-- ${2:Contained}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Create an aggregation relationship",
        },
        {
          label: "package",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "package ${1:PackageName} {\n\t${2}\n}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a package",
        },
        {
          label: "skinparam",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "skinparam ${1:parameter} ${2:value}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Set a diagram parameter",
        },
        {
          label: "title",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "title ${1:Diagram Title}",
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Set the diagram title",
        },
      ];
      return { suggestions };
    },
  });
};

const plantUmlTokenProvider: IMonarchLanguage = {
  tokenizer: {
    root: [
      [/@\w+/, "keyword"],
      [
        /\b(class|interface|enum|abstract|extends|implements|note|actor|usecase|component|package|node|database|cloud|storage|rectangle|folder|frame|state|object|participant|boundary|control|entity|queue|collections|skinparam|title|header|footer|legend|hide|show|left|right|top|bottom|of|on|link|stereotype|spot|circle|ellipse|diamond|<<|>>)\b/,
        "keyword",
      ],
      [
        /\b(private|protected|public|static|final|transient|abstract)\b/,
        "modifier",
      ],
      [
        /\b(String|Integer|Boolean|Double|Float|Long|Short|Byte|Char|Object|Void|List|Map|Set|Collection|ArrayList|HashMap|HashSet|LinkedList|Int|void)\b/,
        "type",
      ],
      [/".*?"/, "string"],
      [/'.*?'/, "string"],
      [/\{/, "delimiter.curly"],
      [/\}/, "delimiter.curly"],
      [/\[/, "delimiter.square"],
      [/\]/, "delimiter.square"],
      [/\(/, "delimiter.parenthesis"],
      [/\)/, "delimiter.parenthesis"],
      [/\b\d+\b/, "number"],
      [/--/, "relationship"],
      [/->/, "relationship.arrow"],
      [/<-/, "relationship.arrow"],
      [/-[|>*]/, "relationship.arrow"],
      [/<\|?-/, "relationship.arrow"],
      [/\.\./, "relationship.dotted"],
      [/\.\|>/, "relationship.dotted.arrow"],
      [/<\|\.\.\|>/, "relationship.dotted.arrow"],
      [/[:#]/, "delimiter"],
      [/\s+as\s+/, "keyword"],
      [
        /\b(if|else|endif|repeat|while|endwhile|fork|again|end fork|end)\b/,
        "control",
      ],
      [/\b(true|false|null)\b/, "constant"],
      [/\/\/.*$/, "comment"],
      [/\/\*/, "comment", "@comment"],
      [/'.*$/, "comment"],
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
  },
};

export const DEFAULT_PLANTUML = `
@startuml
class Person {
  +name: String
  -age: Int
  #address: String
  +greet(): void
}

class Student {
  +module: String
}

class Address {
  +address: String
}

interface Speakable {
  +speak(): void
}
enum Gender {
  MALE
  FEMALE
}

Person <|-- Student
Person o-- "1..*" Address
@enduml`;
