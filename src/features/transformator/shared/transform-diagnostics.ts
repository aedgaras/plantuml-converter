export type TransformDiagnosticLevel = "warning" | "error";

export type TransformDiagnosticSource = {
  stage?: "parse" | "transform" | "validate";
  entity?: string;
  member?: string;
  relation?: string;
  stereotype?: string;
  annotation?: string;
  path?: string;
  method?: string;
};

export type TransformDiagnostic = {
  level: TransformDiagnosticLevel;
  code: string;
  message: string;
  source?: TransformDiagnosticSource;
};

export type TransformMode = "strict" | "permissive";

export type TransformOptions = {
  mode?: TransformMode;
};

export type TransformResult<TDocument> = {
  document: TDocument;
  diagnostics: TransformDiagnostic[];
};
