# Troubleshooting - [Topic/Technology]

## Common Issues

### Issue: [Brief description]
- **Symptoms**: What you observe
- **Root cause**: Why it happens  
- **Solution**: Step-by-step fix
- **Prevention**: How to avoid in future

**Example:**
### Issue: Network connectivity problems
- **Symptoms**: Can't reach certain devices on network
- **Root cause**: Connected to wrong WiFi network/VLAN
- **Solution**: 
  1. Check current network: `ifconfig | grep -A1 'inet ' | grep -v 127.0.0.1`
  2. Connect to correct WiFi network
  3. Verify device accessibility
- **Prevention**: Always check "Which WiFi am I on?" first

## Debugging Commands

### [Technology/System]
```bash
# Command description
command-here

# Another useful command
another-command
```

## Quick Checks

- [ ] First thing to always check
- [ ] Second most common issue
- [ ] Third common gotcha
- [ ] Environment-specific check

## Lessons Learned

### Date: YYYY-MM-DD
- **Context**: Brief situation description
- **Mistake**: What went wrong
- **Learning**: Key insight gained
- **Application**: How to apply this knowledge

---

*Template for capturing troubleshooting knowledge - adapt as needed*