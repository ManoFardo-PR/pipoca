#!/bin/bash
# Hook de pós-merge do REPLIT (.replit → [postMerge]) — não é hook do git.
# D6 (Plan03): desde o D7 o package-lock.json traz devDependencies de verdade
# (playwright-core do harness e2e) — instalar via lockfile, rápido e reprodutível.
set -e

npm ci --no-audit --no-fund || npm install --no-audit --no-fund
