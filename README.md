## Getting Started

### root
- **.env**: Stores environment variables (API keys, secrets).
- **.gitignore**: Specifies files and folders Git should ignore.

### src/
- **config/**: Configuration files including database, blockchain, and environment-specific settings.  
- **controllers/**: Handles incoming HTTP requests and sends responses. Keep controllers thin, delegate logic to services.
- **middleware/**: Reusable middleware functions for authentication, logging, validation, or error handling.
- **models/**: Database or blockchain schema definitions.  
- **routes/**: Define API endpoints and link them to controllers. Organize routes by feature.  
- **services/**: Business logic including AI, blockchain integration, and analytics.  
- **utils/**: Generic helper functions used across the project.  
- **index.js**: Main entry point that initializes the server and connects middleware and routes.

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

### Start the server

```bash
npm start
```

### Run in development mode (auto-reload)

```bash
npm run dev
```


