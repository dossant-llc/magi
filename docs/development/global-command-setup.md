# Making Magi Available as Global Command

This guide explains how to set up `magi` as a global command that can be run from anywhere in your terminal, instead of using `npm run magi`.

## Overview

By default, npm scripts like `npm run magi` only work within the project directory. To make `magi` available globally (like `git` or `docker`), you need to:

1. Configure the package as a CLI tool
2. Install it globally or link it for development

## Setup Steps

### 1. Add Binary Configuration

Add a `bin` field to your `package.json`:

```json
{
  "name": "magi",
  "bin": {
    "magi": "./bin/magi"
  }
}
```

### 2. Create Executable Script

Create the binary script at `./bin/magi`:

```bash
#!/usr/bin/env node

// Option 1: Direct execution
require('../dev/scripts/auto-setup.js');

// Option 2: Route to existing npm script
const { execSync } = require('child_process');
execSync('npm run magi', { stdio: 'inherit', cwd: __dirname + '/..' });
```

### 3. Make Script Executable

```bash
chmod +x ./bin/magi
```

### 4. Install Globally

**For Development (Recommended)**:
```bash
npm link
```
- Creates symlink to current directory
- Changes picked up automatically
- No reinstallation needed for code changes

**For Production**:
```bash
npm install -g .
```
- Copies files to global location
- Requires reinstall after changes
- Better for stable releases

## Development Workflow

### Using npm link (Development)

1. **Initial setup**:
   ```bash
   npm link
   ```

2. **Daily development**:
   - Edit code freely
   - Test with global `magi` command
   - Changes are reflected immediately

3. **What gets updated automatically**:
   - ✅ JavaScript code changes
   - ✅ New files
   - ✅ Binary script changes
   - ❌ New dependencies (need `npm install` in project)
   - ❌ package.json changes affecting dependencies

### Testing Your Global Command

```bash
# Test from any directory
magi status
magi start
magi --help

# Check installation
which magi
ls -la $(which magi)  # Should show symlink if using npm link
```

## Troubleshooting

### Command Not Found

```bash
# Check if globally installed
npm list -g --depth=0 | grep magi

# Check npm global bin path
npm config get prefix
echo $PATH | grep $(npm config get prefix)
```

### Permission Issues

```bash
# Make sure script is executable
chmod +x ./bin/magi

# Check script shebang
head -1 ./bin/magi
# Should be: #!/usr/bin/env node
```

### Symlink Issues (npm link)

```bash
# Remove and recreate link
npm unlink
npm link

# Or use full path
npm link /path/to/your/project
```

### Changes Not Reflecting

- **Code changes**: Should work immediately with `npm link`
- **Dependencies**: Run `npm install` in project directory
- **Binary script**: Should work immediately with `npm link`
- **If stuck**: `npm unlink && npm link`

## Production Deployment

When ready for production:

1. **Test locally**:
   ```bash
   npm unlink        # Remove dev link
   npm install -g .  # Test production install
   magi --version    # Verify
   ```

2. **Publish to npm** (optional):
   ```bash
   npm publish
   npm install -g magi  # Install from registry
   ```

## Best Practices

- Keep binary scripts simple - delegate to main application code
- Use descriptive command names that won't conflict with system commands
- Include `--version` and `--help` flags
- Handle errors gracefully in binary scripts
- Test both `npm link` and `npm install -g` workflows

## Example Binary Script Structure

```javascript
#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');

// Handle basic flags
const args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: magi [command] [options]');
  console.log('Commands: start, stop, status, logs');
  process.exit(0);
}

// Delegate to main application
try {
  execSync(`npm run magi ${args.join(' ')}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  process.exit(error.status || 1);
}
```