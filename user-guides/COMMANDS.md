# MAGI Commands Reference

## Getting All Supported Commands

For the most up-to-date and complete list of all supported magi CLI commands, ask the codebase directly:

**Prompt to use:**
```
"What are all the magi CLI commands available? Please check bin/magi file and list every command case, including any subcommands, options, and their descriptions. Show both what's implemented in code and what's documented in the help text."
```

This ensures you get:
- All implemented commands from the actual code
- Any commands that might be missing from `magi --help`
- Subcommands and options for each command
- The most current functionality available

## Quick Command Discovery

You can also run:
```bash
magi --help    # Shows documented commands
magi -h        # Same as above
```

But use the codebase prompt above for the complete and authoritative list, as the help text may lag behind actual implementation.