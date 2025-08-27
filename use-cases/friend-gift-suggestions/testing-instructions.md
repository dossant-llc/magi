# Testing Instructions: Friend Gift Suggestions

## Overview
This scenario requires **two separate AGIfor.me installations** to simulate friend-to-friend mAgi communication.

## Prerequisites
- Two computers/VMs with AGIfor.me installed
- Both systems on same network (for local discovery) OR
- Network connectivity between systems (direct IP/port access)
- Test memory files created per test-data.md

## Setup Phase

### 1. Deploy Two mAgi Systems

**System A - Alex (Gift Giver)**:
```bash
# Clone and setup
git clone https://github.com/yourusername/agiforme alex-magi
cd alex-magi
npm install
./setup.sh

# Enable social features
echo "ENABLE_SOCIAL_FEATURES=true" >> .env
echo "MAGI_ID=alex-personal.local" >> .env
echo "MAGI_NETWORK_PORT=3001" >> .env

# Start with social networking
./start.sh --with-social
```

**System B - Sarah (Gift Recipient)**:
```bash
# Clone and setup  
git clone https://github.com/yourusername/agiforme sarah-magi
cd sarah-magi
npm install
./setup.sh

# Enable social features
echo "ENABLE_SOCIAL_FEATURES=true" >> .env  
echo "MAGI_ID=sarah-home.local" >> .env
echo "MAGI_NETWORK_PORT=3002" >> .env

# Start with social networking
./start.sh --with-social
```

### 2. Create Test Memories

**In Alex's system** - Create memories from test-data.md:
- `memories/social/friends-network.md`
- `memories/personal/gift-giving-approach.md` 
- `memories/private/sarah-birthday-2024.md`

**In Sarah's system** - Create memories from test-data.md:
- `memories/personal/hobbies-current.md`
- `memories/personal/wishlist-2024.md`
- `memories/private/recent-purchases.md`
- `memories/personal/gift-preferences.md`
- `memories/social/friends-whitelist.md` (from social-setup.md)
- `memories/social/auto-approval-policies.md` (from social-setup.md)

### 3. Establish Friend Connection

**On Alex's system**:
```bash
# Add Sarah as friend
curl -X POST localhost:3001/social/friends \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Martinez",
    "magi_id": "sarah-home.local",
    "ip_address": "192.168.1.100", 
    "port": 3002,
    "relationship": "close_friend"
  }'
```

**On Sarah's system**:
```bash  
# Add Alex as friend
curl -X POST localhost:3002/social/friends \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Chen",
    "magi_id": "alex-personal.local", 
    "ip_address": "192.168.1.101",
    "port": 3001,
    "relationship": "close_friend"
  }'
```

**Verify connection**:
```bash
# From Alex's system
curl localhost:3001/social/ping/sarah-home.local

# From Sarah's system  
curl localhost:3002/social/ping/alex-personal.local
```

## Testing Scenarios

### Scenario 1: Successful Auto-Approved Gift Request

**Test Flow**:
1. Alex initiates gift suggestion request
2. Sarah's system auto-approves (matches policy)
3. Filtered gift data returned to Alex
4. Alex gets personalized recommendations

**Step 1 - Initiate Request (Alex's system)**:
```bash
curl -X POST localhost:3001/social/request \
  -H "Content-Type: application/json" \
  -d '{
    "to_friend": "sarah-home.local",
    "request_type": "gift_suggestion",
    "intent": "Birthday gift ideas for Sarah",
    "context": {
      "occasion": "birthday", 
      "budget_range": [40, 75],
      "timeline": "within 1 week"
    },
    "requested_categories": [
      "current_hobbies",
      "wishlist_items",
      "recent_purchases", 
      "gift_preferences"
    ]
  }'
```

**Step 2 - Check Auto-Approval (Sarah's system)**:
```bash
# Should see auto-approval in logs
tail -f logs/social-requests.log

# Check that request was approved
curl localhost:3002/social/requests/pending
# Should return empty array (auto-approved)

curl localhost:3002/social/requests/approved  
# Should show the approved request
```

**Step 3 - Verify Response (Alex's system)**:
```bash
# Check for response data
curl localhost:3001/social/responses/latest

# Should receive filtered gift suggestion data
# Validate that sensitive info is excluded
# Confirm practical recommendations are included
```

**Expected Results**:
- ✅ Request auto-approved within seconds
- ✅ Sarah's sensitive financial info excluded  
- ✅ Current hobbies and wishlist included
- ✅ Recent purchases shared to avoid duplicates
- ✅ Local business preferences included
- ✅ Alex receives actionable gift recommendations

### Scenario 2: Manual Review Required

**Test Flow**:
1. Simulate request that doesn't match auto-approval policy
2. Sarah gets notification for manual review
3. Sarah customizes approval
4. Filtered response sent to Alex

**Step 1 - Initiate Non-Standard Request**:
```bash
curl -X POST localhost:3001/social/request \
  -H "Content-Type: application/json" \
  -d '{
    "to_friend": "sarah-home.local",
    "request_type": "general_advice",
    "intent": "Help with Sarah personal situation", 
    "requested_categories": [
      "personal_struggles",
      "relationship_status",
      "work_situation"
    ]
  }'
```

**Step 2 - Manual Review (Sarah's system)**:
```bash
# Check pending requests (should require manual review)
curl localhost:3002/social/requests/pending

# Simulate Sarah's manual decision
curl -X POST localhost:3002/social/approve \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_12345",
    "status": "partial", 
    "approved_categories": ["general_well_being"],
    "denied_categories": ["relationship_status", "work_situation"],
    "custom_message": "Hope youre doing well but keeping work/relationship stuff private"
  }'
```

**Expected Results**:
- ✅ Request goes to manual review queue
- ✅ Sarah can customize what to share
- ✅ Only approved categories are shared  
- ✅ Clear notification to Alex about partial approval

### Scenario 3: Request Denial

**Test Flow**:
1. Request from unknown/untrusted source
2. System auto-denies or prompts for manual denial
3. No data shared, clear denial message

**Step 1 - Simulate Unknown Requester**:
```bash  
# Try request from unverified mAgi ID
curl -X POST localhost:3001/social/request \
  -H "Content-Type: application/json" \
  -d '{
    "to_friend": "sarah-home.local",
    "from_magi": "unknown-stranger.suspicious",
    "request_type": "gift_suggestion"
  }'
```

**Expected Results**:
- ✅ Request denied automatically (not in whitelist)
- ✅ No personal data shared
- ✅ Clear denial message with reason
- ✅ Security event logged

### Scenario 4: Time-Limited Access

**Test Flow**:
1. Approve request with time limit
2. Verify access works during window
3. Confirm access expires automatically

**Step 1 - Time-Limited Approval**:
```bash
# Sarah approves with 1-hour time limit
curl -X POST localhost:3002/social/approve \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_12345",
    "status": "approved",
    "duration": "1_hour",
    "auto_delete": true
  }'
```

**Step 2 - Verify Access During Window**:
```bash
# Alex can access data immediately
curl localhost:3001/social/data/req_12345
# Should return Sarah's data
```

**Step 3 - Verify Expiration**:
```bash
# Wait 1 hour, then try again
sleep 3600
curl localhost:3001/social/data/req_12345  
# Should return "access expired" error
```

**Expected Results**:
- ✅ Data accessible during approved window
- ✅ Access revoked automatically after expiration
- ✅ Expired data deleted from Alex's system
- ✅ New request required for additional access

## User Experience Testing

### 1. Alex's Experience (Gift Giver)
**Test the full user journey**:
```bash
# Alex talks to his mAgi
curl -X POST localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me find a birthday gift for Sarah. Budget around $50."
  }'

# Should trigger:
# 1. Recognition that Sarah is a known friend  
# 2. Automatic request to Sarah's mAgi
# 3. Processing of response into gift recommendations
# 4. Practical, actionable suggestions with local sourcing
```

**Expected Alex Experience**:
- ✅ Natural conversation with his mAgi
- ✅ Automatic friend mAgi consultation  
- ✅ Personalized gift recommendations
- ✅ Local store suggestions when possible
- ✅ Budget-appropriate options
- ✅ Reasoning for each recommendation

### 2. Sarah's Experience (Gift Recipient)  
**Test the privacy control experience**:

**Auto-Approval Scenario**:
- ✅ No interruption for trusted friend gift request
- ✅ Notification log shows what was shared
- ✅ Can review shared data after the fact

**Manual Review Scenario**:
- ✅ Clear notification of unusual request
- ✅ Easy approval/denial interface
- ✅ Granular control over what to share
- ✅ Option to add context message

## Privacy Validation

### 1. Data Filtering Verification
```bash
# Check that sensitive data is never shared
grep -r "exact budget\|financial stress\|income" sarah-magi/logs/social-shared.log
# Should return no results

# Verify appropriate data IS shared  
grep -r "Danish bread whisk\|hiking socks" sarah-magi/logs/social-shared.log
# Should show these items were shared
```

### 2. Audit Trail Verification
```bash
# Sarah can see what she shared with whom
curl localhost:3002/social/audit/outbound

# Alex can see what data he received from whom  
curl localhost:3001/social/audit/inbound

# Both should have complete, matching records
```

### 3. Expiration Verification
```bash
# Check that expired data is actually deleted
find . -name "*social*" -exec grep -l "req_expired_12345" {} \;
# Should return no files after expiration
```

## Success Criteria

### ✅ Core Functionality
- [ ] Friend discovery and connection works
- [ ] Auto-approval policies function correctly
- [ ] Manual review process is intuitive
- [ ] Data filtering protects sensitive information
- [ ] Time limits are enforced automatically

### ✅ User Experience  
- [ ] Alex gets useful, personalized gift recommendations
- [ ] Sarah maintains control over her data sharing
- [ ] Process feels natural and non-invasive
- [ ] Trust between friends is maintained/enhanced

### ✅ Privacy & Security
- [ ] Sensitive data never shared without explicit permission
- [ ] Complete audit trail of all social interactions
- [ ] Expired permissions automatically revoked
- [ ] Unknown requesters automatically denied

### ✅ Technical Integration
- [ ] Systems discover each other reliably
- [ ] API communication is robust and secure
- [ ] Error handling provides clear feedback
- [ ] Performance is acceptable for real-time interaction

## Troubleshooting

### Common Issues
- **Friend not discoverable**: Check network connectivity, firewall settings
- **Auto-approval not working**: Verify policy files are correctly formatted
- **Data not filtered**: Check privacy tags in memory files
- **Request timeout**: Verify both systems are running and responsive

### Debug Commands
```bash
# Check social networking status
curl localhost:3001/social/status

# View friend connection details
curl localhost:3001/social/friends/sarah-home.local

# Check recent social requests/responses
tail -f logs/social-activity.log

# Test basic connectivity
ping sarah-home.local
telnet sarah-home.local 3002
```

## Expected Demo Outcome

After successful testing, you should be able to demonstrate:

1. **Natural friend-to-friend AI interaction** without manual data sharing
2. **Granular privacy control** that protects sensitive information
3. **Practical value** - Alex gets better gift ideas, Sarah helps without effort  
4. **Trust enhancement** - Friends feel good about helping each other
5. **Social scaling** - Model works for broader friend/family networks

This validates the **social networking potential** of AGIfor.me where personal AI assistants can collaborate while respecting user privacy and autonomy.