# Contributing to Capsule 📦

Thank you for your interest in contributing to **Capsule**! Capsule is built to be a rock-solid, ultra-fast, and ergonomic terminal flight recorder for developers and AI agents worldwide.

---

## 🛠️ Development Setup

Capsule is built with modern **TypeScript**, bundled with **tsup**, and tested with **Vitest**.

### Prerequisites
- **Node.js**: v18.0.0 or higher (`node -v`)
- **pnpm**: v11+ (`pnpm -v`)
- **Git**: Installed and available in your `PATH`

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shenald-dev/capsule.git
   cd capsule
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   pnpm approve-builds --all
   ```

3. **Run in development mode:**
   ```bash
   pnpm dev run node examples/failing-node.js
   ```

4. **Run the test suite:**
   ```bash
   pnpm test
   ```

5. **Typecheck and build:**
   ```bash
   pnpm typecheck
   pnpm build
   ```

---

## 🏗️ Architectural Guidelines

- **Zero Unsanitized Output:** All environment variables and log snapshots must pass through `redactEnvironment()` and `redactString()`.
- **Cross-Platform Parity:** All path operations must support both POSIX forward slashes and Windows backslashes using `node:path`.
- **Sub-5ms Latency:** Child process execution wrapper overhead must remain $< 5\text{ms}$. Avoid heavy synchronous operations in the main streaming thread.
- **Fail Gracefully:** Never crash the parent developer terminal if an internal parsing heuristic fails. Fallback to generic command output.

---

## 🧪 Testing Policy

Every pull request must include tests verifying the behavior:
- **Unit tests** in `tests/unit/`: Test individual stacktrace purifiers, secret regex rules, and storage persistence.
- **Integration tests** in `tests/integration/`: Verify end-to-end command execution and exit code propagation.

Run tests before submitting:
```bash
pnpm test
pnpm typecheck
```

---

## 📜 Pull Request Checklist

- [ ] Code strictly passes `pnpm typecheck` without any errors.
- [ ] All unit and integration tests pass via `pnpm test`.
- [ ] No secrets, private credentials, or personal system paths committed.
- [ ] Commit messages follow standard Conventional Commits format (`feat: ...`, `fix: ...`, `docs: ...`).

---

## 📄 License

By contributing to Capsule, you agree that your contributions will be licensed under the [MIT License](LICENSE).
