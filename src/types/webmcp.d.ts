export interface ModelContextTool<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    [key: string]: unknown;
  };
  execute: (input: TInput, context: { signal?: AbortSignal }) => Promise<TOutput | string>;
}

export interface RegisterToolOptions {
  signal?: AbortSignal;
}

export interface ModelContext extends EventTarget {
  registerTool(tool: ModelContextTool<any, any>, options?: RegisterToolOptions): Promise<void>;
  unregisterTool?(name: string): Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}
