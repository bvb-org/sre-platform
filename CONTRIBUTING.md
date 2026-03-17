# Contributing to SRE Platform

Thank you for your interest in contributing to the SRE Platform! This document provides guidelines and best practices for contributing to the project.

## Getting Started

1. **Fork the repository** and clone it locally
2. **Set up your development environment** following the [SETUP.md](docs/SETUP.md) guide
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### 1. Code Standards

- **JavaScript/TypeScript**: Follow ESLint configuration
- **Formatting**: Use consistent indentation (2 spaces)
- **Naming**: Use descriptive variable and function names
- **Comments**: Document complex logic and public APIs

### 2. Commit Messages

Use conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(incidents): add timeline filtering"
git commit -m "fix(postmortem): resolve AI generation timeout"
git commit -m "docs(api): update endpoint documentation"
```

### 3. Code Quality

Before submitting a pull request:

```bash
# Lint your code
npm run lint

# Run tests
cd backend && npm test

# Test Docker build
docker compose up --build -d
```

### 4. Testing

- Write tests for new features
- Ensure existing tests pass
- Test in Docker environment
- Verify health checks work

### 5. Pull Requests

1. **Create a feature branch** with a descriptive name
2. **Make your changes** with clear commit messages
3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
4. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference any related issues
   - List of changes made
   - Screenshots (if UI changes)
   - Testing notes

**Pull Request Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Docker build succeeds
```

## Project Structure

```
sre-platform/
├── app/                    # Next.js frontend
│   ├── components/        # React components
│   ├── incidents/         # Incident pages
│   ├── runbooks/          # Runbook pages
│   └── postmortems/       # Postmortem pages
├── backend/               # Express.js API
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── tests/            # Backend tests
├── liquibase/            # Database migrations
│   └── changesets/       # Migration files
├── websocket/            # Socket.io server
└── docs/                 # Documentation
```

## Adding New Features

### Database Changes

1. Create a new Liquibase changeset in `liquibase/changesets/`
2. Update `liquibase/db.changelog-master.xml`
3. Test locally with Docker

### API Endpoints

1. Add route handler in `backend/routes/`
2. Register route in `backend/server.js`
3. Update `backend/API.md` documentation
4. Add tests in `backend/tests/`

### Frontend Components

1. Create component in appropriate `app/` directory
2. Follow existing component patterns
3. Use TypeScript for type safety
4. Add dark mode support with Tailwind classes

## Environment Variables

- Never commit `.env` files
- Update `.env.example` with new variables
- Document new variables in README.md

## Logging

Use the structured logger instead of console.log:

```javascript
const { createLogger } = require('./utils/logger');
const logger = createLogger('MyModule');

logger.debug('Detailed information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error message', error);
```

## Docker Development

### Rebuild After Code Changes

```bash
docker compose up -d --build
```

### View Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f websocket
```

### Restart Individual Services

```bash
docker compose restart backend
docker compose restart frontend
```

## Common Issues

### Port Conflicts
If ports 3000, 3001, 4000, or 5432 are in use:
```bash
docker compose down
# Find and stop processes using the ports
lsof -i :3000
kill -9 <PID>
```

### Database Issues
Reset the database:
```bash
docker compose down -v
docker compose up -d
```

### Node Module Issues
Clear and reinstall:
```bash
rm -rf node_modules backend/node_modules websocket/node_modules
npm install
cd backend && npm install && cd ..
cd websocket && npm install && cd ..
```

## Code Review Process

1. Maintainers will review your PR
2. Address feedback and make changes
3. Push updates to your branch
4. Once approved, your PR will be merged

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues and documentation first
- Be respectful and constructive

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
