# Changelog

All notable changes to `@shenald/capsule` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-11-20

### 🚀 Added
- **Golang Panic & Goroutine Purifier (`src/core/purifier/go.ts`)**:
  - Automatically identifies Go runtime panics, deadlock fatal errors, and goroutine stacktraces.
  - Strips standard library and runtime internal frames (`/src/runtime/`, `runtime.`, `testing.`).
  - Extracts application source code snippets with execution line pointers and parses pointer receiver methods.
- **JVM Stacktrace Purifier (`src/core/purifier/jvm.ts`)**:
  - Full support for Java, Kotlin, Scala, and Spring Framework exceptions.
  - Recursively resolves innermost `Caused by:` exception root causes and prioritizes nested application frames.
  - Filters JDK runtime and framework internals (`java.*`, `javax.*`, `jdk.*`, `org.gradle.*`, `org.springframework.*`).
  - Resolves source files across project directories with highlighted code previews.
- **Compiler Error Purifier & Code Previews (`src/core/purifier/generic.ts`)**:
  - Full diagnostic extraction for TypeScript (`tsc` `error TSxxxx`), Rustc (`error[Exxxx]`), GCC/Clang, and Javac errors.
  - Automatically loads and renders failing source code snippets with line pointers directly on terminal triage cards.
  - Classifies Segmentation Faults (SIGSEGV / Exit 139), Out of Memory / OOM crashes (Exit 137), and AddressSanitizer (ASAN) memory leaks.
- **Modern & Legacy Rust Panic Support (`src/core/purifier/rust.ts`)**:
  - Complete support for modern Rust 1.70+ panics (`thread 'x' panicked at file:line:col:\nmsg`) alongside legacy formats.
- **Heuristic Diagnostic Remedy Engine (`src/core/analyzer.ts`)**:
  - Automated detection of common failure categories: `MISSING_DEPENDENCY`, `PORT_CONFLICT`, `CONNECTION_REFUSED`, `PERMISSION_DENIED`, `MEMORY_EXHAUSTION`, `SEGMENTATION_FAULT`, `COMMAND_NOT_FOUND`, `EXECUTION_TIMEOUT`, `DATABASE_MIGRATION`, and `GIT_CONFLICT`.
  - Surfaces actionable shell commands (`npm install <pkg>`, `pip install <pkg>`, `lsof -i :<port>`, `where <cmd>` on Windows / `which <cmd>` on POSIX) directly on terminal triage cards.
- **Multi-Format AI Prompt Generator (`src/core/prompts.ts`)**:
  - Support for 4 specialized AI export formats:
    - `markdown`: Standard clean document.
    - `claude`: Anthropic XML tagged format with `<incident_report>`, `<code_frame>`, `<purified_stacktrace>`, `<git_diff>`, and `<terminal_tail>`.
    - `chatgpt`: Structured OpenAI JSON chat completion format with system and user messages.
    - `github`: Issue template featuring collapsible `<details>` blocks for error logs, stacktraces, and diffs.
- **Strict-Guard Secret Redactor Enhancements (`src/core/redactor.ts`)**:
  - Masking for database credentials in PostgreSQL, MongoDB, Redis (including username-less `redis://:pass@host`), MySQL, MariaDB, AMQP, and MSSQL URIs.
  - Redaction across YAML, JSON, and whitespace-equal configurations (`api_key: secret`, `{"password": "secret"}`, `token = secret`).
  - Detection and masking of classic and fine-grained GitHub PATs (`ghp_`, `github_pat_`), OpenAI (`sk-`), Anthropic (`sk-ant-`), Google Gemini (`AIzaSy`), AWS Access Key IDs (`AKIA`), and Slack bot tokens (`xoxb-`).
- **Process Execution Timeout Supervisor & Tree Termination (`src/core/runner.ts`)**:
  - `-t, --timeout <ms>` flag to kill hung commands and runaway tests.
  - Clean process tree termination on Windows (`taskkill /T /F`) and POSIX signals, eliminating orphan background worker processes.
  - Standard Linux exit code 124 mapping and bounded memory buffers.
- **Portable Incident Bundles & Flexible Search (`src/core/storage.ts`)**:
  - `capsule export [id] -o <bundle.json>`: Export standalone reproducible JSON incident capsules.
  - `capsule import <bundle.json>`: Import and replay shared incident bundles.
  - `capsule list --search <query> --status <failed|success> --exit-code <code>`: Query recorded incidents.
  - Partial identifier matching: View, replay, or copy incidents using short prefix hashes (e.g. `capsule explain y3sx`).
  - Working directory preservation (`cwd`) in incident capsules ensuring deterministic `capsule replay` in original project directories.
- **System Doctor Multi-Toolchain Inspection (`src/cli/commands/doctor.ts`)**:
  - Automatic detection and reporting of Python, Go, Rust, and JVM toolchains.
- **Empirical Benchmark Suite (`benchmarks/run-benchmarks.ts`)**:
  - Validates process overhead, purifier throughput (>7,300 ops/sec), secret redactor throughput (>160 MB/s), and prompt generation speed.

### ⚡ Optimized
- Process runner streaming overhead reduced to < 1ms imperceptible passthrough.
- Pure single-pass regex secret masking for high-volume logs.

### 🔒 Security
- Zero-leakage database password protection across all error outputs and environment snapshots.

---

## [0.1.0] - 2026-11-06

### Initial Release
- Terminal command flight recorder (`capsule run`).
- V8 Node.js, Python, Rust, and generic error purifiers.
- Secret redactor for environment variables and basic private keys/JWTs.
- Git snapshot freeze (branch, commit, uncommitted dirty diff).
- 1-click clipboard export (`capsule copy`).
- Deterministic command replay (`capsule replay`).
- Diagnostic health doctor (`capsule doctor`).
