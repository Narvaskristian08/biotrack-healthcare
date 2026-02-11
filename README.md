## Getting Started

### src/
- **config/**: Configuration files including database, blockchain, and environment-specific settings.  
- **controllers/**: Handles incoming HTTP requests and sends responses. Keep controllers thin, delegate logic to services.
- **middleware/**: Reusable middleware functions for authentication, logging, validation, or error handling.
- **models/**: Database or blockchain schema definitions.  
- **routes/**: Define API endpoints and link them to controllers. Organize routes by feature.  
- **services/**: Business logic including AI, blockchain integration, and analytics.  
- **utils/**: Generic helper functions used across the project.  
- **index.js**: Main entry point that initializes the server and connects middleware and routes.

### root
- **.env**: Stores environment variables (API keys, secrets).
- **.gitignore**: Specifies files and folders Git should ignore.

## Quick Setup 

### Clone the repository

```bash
git clone https://github.com/dev-jsc0f1eld/biotrack-healthcare.git
cd biotrack-healthcare
```

### Checkout backend branch

```bash
git checkout backend
```

### Install dependencies

```bash
npm install
```

### IMPORTANT: Create .env file

Copy `env.example` to `.env` and set your values:

```bash
cp env.example .env
```

For blockchain identity + integrity anchoring, set:

- `BLOCKCHAIN_ENABLED=true`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS`
- `BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS`

Keep `BLOCKCHAIN_ENABLED=false` for local/off-chain mode.

### Start the server

```bash
npm start
```

### Run in development mode (auto-reload)

```bash
npm run dev
```

## Blockchain Features

- Patient and health center registration now creates a blockchain identity reference.
- Identity metadata is saved in MongoDB and optionally anchored on-chain.
- Patient record creation computes a deterministic record hash and can anchor proof on-chain.
- New integrity endpoint:
  - `GET /api/patients/:patientId/records/:recordId/verify`
  - Recomputes DB hash, compares stored hash, and verifies on-chain proof when available.

## Testing Guide

For full end-to-end instructions (local-only mode, on-chain mode, tamper test, strict-mode test), read:

- `README-TESTING-BLOCKCHAIN.md`


