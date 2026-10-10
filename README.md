# Admin panel frontend

Independent Next.js frontend. Node 22.13+, module-local dependencies/settings.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run dev
```

Use ci for a fresh installation. Start matching backend separately on 4000.
Preview port 3000. Configure addresses using .env.example; preserve existing private files.
The portal uses server-side API_BASE_URL and ADMIN_FRONTEND_ORIGIN. Login requires a CLI-provisioned admin password and TOTP. Access/refresh credentials stay in HttpOnly cookies; CSRF protects mutations.

```powershell
npm.cmd run check
npm.cmd run format:check
npm.cmd run test:ui
```

check includes lint, TypeScript, five unit/client tests and Next production build.
UI checks require the matching backend build, local MongoDB replica set and Chrome/Edge or
Playwright Chromium. They launch isolated servers and use disposable test identities.
Native Android/iOS remains untested; follow [device checklist](docs/project/DEVICE_VERIFICATION.md).

See [runbook](docs/project/PHASE_1_RUNBOOK.md) and [handover](docs/project/PHASE_1_HANDOVER.md).
No sibling runtime imports. Nested CI applies when this module is its own GitHub repository.

## Current Phase 2

Read [Phase 2 handover](docs/project/PHASE_2_HANDOVER.md), [domain specification](docs/project/PHASE_2_SPEC.md) and [API guide](docs/project/PHASE_2_API.md). Admin now has an explicitly permitted MFA-protected assisted-consent queue, evidence/distinct approval/withdrawal workflow and redacted support.

## GitHub setup

See [repository mapping and clone instructions](docs/project/GITHUB_REPOSITORIES.md). Private environment files are local only; use .env.example when setting up a new clone.
