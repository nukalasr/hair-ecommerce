#!/usr/bin/env node
/**
 * Production Configuration Validator
 *
 * This script validates that required production environment values are set
 * before building for production. Run this as part of the build process.
 *
 * Usage:
 *   node scripts/validate-prod-config.js
 *
 * Exit codes:
 *   0 - All required values are set
 *   1 - One or more required values are missing
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bold}${colors.blue}║     Production Configuration Validator                      ║${colors.reset}`);
console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

// Read the production environment file
const envProdPath = path.join(__dirname, '../src/environments/environment.prod.ts');

if (!fs.existsSync(envProdPath)) {
  console.error(`${colors.red}✗ ERROR: environment.prod.ts not found at ${envProdPath}${colors.reset}`);
  process.exit(1);
}

const content = fs.readFileSync(envProdPath, 'utf8');

// Validation rules
const validations = [
  {
    name: 'Stripe Publishable Key',
    regex: /stripePublishableKey:\s*['"]([^'"]*)['"]/,
    required: true,
    validate: (value) => {
      if (!value || value.trim() === '') {
        return { valid: false, message: 'Empty - add your Stripe publishable key' };
      }
      if (value.includes('TODO')) {
        return { valid: false, message: 'Contains TODO placeholder' };
      }
      if (!value.startsWith('pk_live_') && !value.startsWith('pk_test_')) {
        return { valid: false, message: 'Must start with pk_live_ or pk_test_' };
      }
      if (value.startsWith('pk_test_')) {
        return { valid: true, warning: 'Using TEST key - switch to LIVE key for production' };
      }
      return { valid: true };
    }
  },
  {
    name: 'API URL',
    regex: /apiUrl:\s*['"]([^'"]*)['"]/,
    required: true,
    validate: (value) => {
      if (!value || value.trim() === '') {
        return { valid: false, message: 'Empty - add your backend API URL' };
      }
      if (value.includes('TODO')) {
        return { valid: false, message: 'Contains TODO placeholder' };
      }
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        return { valid: false, message: 'Cannot use localhost in production' };
      }
      if (!value.startsWith('https://')) {
        return { valid: false, message: 'Must use HTTPS in production' };
      }
      return { valid: true };
    }
  },
  {
    name: 'Sentry DSN',
    regex: /sentryDsn:\s*['"]([^'"]*)['"]/,
    required: false, // Optional but recommended
    validate: (value) => {
      if (!value || value.trim() === '') {
        return { valid: true, warning: 'Empty - error monitoring will be disabled' };
      }
      if (value.includes('TODO')) {
        return { valid: true, warning: 'Contains TODO placeholder - monitoring disabled' };
      }
      if (!value.startsWith('https://') || !value.includes('@') || !value.includes('.ingest.sentry.io')) {
        return { valid: false, message: 'Invalid Sentry DSN format' };
      }
      return { valid: true };
    }
  }
];

let hasErrors = false;
let hasWarnings = false;

validations.forEach(validation => {
  const match = content.match(validation.regex);
  const value = match ? match[1] : '';
  const result = validation.validate(value);

  if (!result.valid) {
    if (validation.required) {
      console.log(`${colors.red}✗ ${validation.name}: ${result.message}${colors.reset}`);
      hasErrors = true;
    } else {
      console.log(`${colors.yellow}⚠ ${validation.name}: ${result.message}${colors.reset}`);
      hasWarnings = true;
    }
  } else if (result.warning) {
    console.log(`${colors.yellow}⚠ ${validation.name}: ${result.warning}${colors.reset}`);
    hasWarnings = true;
  } else {
    console.log(`${colors.green}✓ ${validation.name}: Configured${colors.reset}`);
  }
});

// Additional security checks
console.log(`\n${colors.bold}Security Checks:${colors.reset}`);

// Check for secret keys (should never be in frontend)
// Only check in actual code assignments, not comments
const secretKeyPattern = /['"]sk_(live|test)_[a-zA-Z0-9]+['"]/;
if (secretKeyPattern.test(content)) {
  console.log(`${colors.red}✗ CRITICAL: Secret key detected! Never include secret keys in frontend code.${colors.reset}`);
  hasErrors = true;
} else {
  console.log(`${colors.green}✓ No secret keys detected${colors.reset}`);
}

// Check production flag
if (!content.includes('production: true')) {
  console.log(`${colors.red}✗ production flag must be true${colors.reset}`);
  hasErrors = true;
} else {
  console.log(`${colors.green}✓ Production flag is true${colors.reset}`);
}

// Summary
console.log(`\n${colors.bold}────────────────────────────────────────────────────────────${colors.reset}`);

if (hasErrors) {
  console.log(`\n${colors.red}${colors.bold}✗ VALIDATION FAILED${colors.reset}`);
  console.log(`${colors.red}Please fix the errors above before building for production.${colors.reset}`);
  console.log(`\n${colors.yellow}To configure production values:${colors.reset}`);
  console.log(`  1. Edit: src/environments/environment.prod.ts`);
  console.log(`  2. Set stripePublishableKey to your Stripe key`);
  console.log(`  3. Set apiUrl to your production API URL`);
  console.log(`  4. Optionally set sentryDsn for error monitoring\n`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`\n${colors.yellow}${colors.bold}⚠ VALIDATION PASSED WITH WARNINGS${colors.reset}`);
  console.log(`${colors.yellow}The build will proceed, but review the warnings above.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${colors.green}${colors.bold}✓ VALIDATION PASSED${colors.reset}`);
  console.log(`${colors.green}Production configuration is valid.${colors.reset}\n`);
  process.exit(0);
}
