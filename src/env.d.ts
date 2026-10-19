interface ImportMetaEnv {
  /** 'true' turns on the demo-only UI and tools, including ?frame=iphone (HANDOFF §13.1 #10) */
  readonly VITE_DEMO?: string;
  /** mock API latency in ms: 'min-max' or one number, 0 in tests (HANDOFF §7) */
  readonly VITE_MOCK_LATENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
