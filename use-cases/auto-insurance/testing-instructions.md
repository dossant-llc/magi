# Testing Instructions

## Setup Phase

### 1. Prepare Test Environment
```bash
# Ensure AGIfor.me is running
cd /path/to/agiforme
./start.sh

# Verify BrainBridge MCP server is responding
# Check logs for successful startup
```

### 2. Create Test Memories
Copy the memory files from `test-data.md` into your `memories/` folder:

```bash
# Create the test memory files
mkdir -p memories/team memories/private memories/personal memories/sensitive

# Copy each file from test-data.md to appropriate location
# - driving-record.md → memories/team/
# - vehicle-info.md → memories/private/  
# - insurance-research.md → memories/personal/
# - financial-limits.md → memories/sensitive/
```

### 3. Verify Memory Organization
```bash
# Check that memories are accessible
# Use search_memories tool to find "insurance" or "driving"
# Confirm privacy levels are respected
```

## Testing Scenarios

### Scenario 1: Full Access Approval

**Test Steps**:
1. Simulate business request for all data categories
2. User approves full access for 24 hours
3. Verify filtered response includes appropriate data
4. Confirm sensitive financial data is excluded

**Expected Flow**:
```
Business Request → User Notification → Full Approval → Filtered Response
```

**Validation**:
- ✅ Driving record shared (team privacy level)
- ✅ Vehicle info shared (private privacy level)  
- ✅ Insurance preferences shared (personal privacy level)
- ❌ Exact budget numbers protected (sensitive privacy level)

### Scenario 2: Partial Access Approval  

**Test Steps**:
1. Simulate business request for all data categories
2. User customizes approval (exclude budget info entirely)
3. Verify response only includes approved categories
4. Confirm excluded data is not shared

**Expected Flow**:
```
Business Request → User Notification → Custom Approval → Limited Response
```

**Validation**:
- ✅ Driving record and vehicle info shared
- ✅ Coverage preferences shared
- ❌ Budget/financial info completely excluded
- ❌ Context notes about budget not included

### Scenario 3: Access Denial

**Test Steps**:
1. Simulate business request
2. User denies all access
3. Verify business receives denial response
4. Confirm no data is shared

**Expected Flow**:
```
Business Request → User Notification → Denial → Empty Response
```

**Validation**:
- ❌ No personal data shared
- ✅ Business receives clear "access denied" message
- ✅ User privacy fully protected

### Scenario 4: Time-Limited Access

**Test Steps**:
1. Approve access for 1 hour only
2. Verify access works during approved window
3. Wait for access to expire
4. Confirm subsequent requests are blocked

**Expected Flow**:
```
Business Request → Time-Limited Approval → Access Granted → Time Expires → Access Blocked
```

**Validation**:
- ✅ Data shared during approved window
- ❌ Access automatically revoked after expiration
- ✅ Business must request new permission

## Manual Testing Workflow

### Option A: Command Line Testing
```bash
# 1. Simulate business request
curl -X POST localhost:3001/mcp/request \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "acme-insurance", 
    "intent": "auto_insurance_quote",
    "data_requested": ["driving_record", "vehicle_info", "coverage_preferences"],
    "privacy_levels": ["team", "personal", "private"],
    "duration": "24_hours"
  }'

# 2. Check for consent notification
# (Would appear in BrainKeeper UI or CLI)

# 3. Simulate user approval
curl -X POST localhost:3001/consent/approve \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_12345",
    "approved_categories": ["driving_record", "vehicle_info", "coverage_preferences"],
    "duration": "24_hours",
    "restrictions": ["exclude_exact_budget"]
  }'

# 4. Verify business receives filtered data
curl -X GET localhost:3001/mcp/data/req_12345
```

### Option B: UI Testing (Future)
1. Open mock business website
2. Click "Query My mAgi" button
3. Check AGIfor.me UI for consent notification
4. Test different approval scenarios
5. Verify business receives appropriate data

## Success Criteria

### ✅ Privacy Controls Work
- [ ] User sees clear consent notifications
- [ ] Approval/denial controls function correctly  
- [ ] Sensitive data is never shared without explicit permission
- [ ] Time limits are enforced automatically

### ✅ Business Integration Works
- [ ] Business receives well-structured data responses
- [ ] Filtered data excludes protected information
- [ ] Response format matches expected schema
- [ ] Error handling works for denied/expired requests

### ✅ User Experience is Clear
- [ ] Notifications explain what data is requested and why
- [ ] Approval process is intuitive and quick
- [ ] User can easily customize what to share
- [ ] Access history is logged and reviewable

## Troubleshooting

### Common Issues
- **No consent notification**: Check BrainKeeper UI is running
- **Data not filtered**: Verify privacy levels are set correctly in memory files
- **Business can't access data**: Check request format matches schema
- **Time limits not working**: Verify consent expiration logic

### Debug Commands
```bash
# Check memory file privacy levels
grep -r "privacy:" memories/

# Verify MCP server is running
ps aux | grep brainbridge

# Check consent logs
tail -f logs/consent-requests.log
```

## Expected Results

After successful testing, you should be able to demonstrate:

1. **Complete business scenario** from initial request to personalized quote
2. **Privacy protection in action** with granular user control
3. **Seamless user experience** without lengthy form filling
4. **Business value** through better customer data and higher conversion

This testing validates both the technical implementation and the business value proposition of privacy-controlled AI data sharing.