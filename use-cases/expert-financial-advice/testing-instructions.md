# Testing Instructions: Expert Marketplace

## Overview
This scenario requires **three interconnected systems** to simulate the complete knowledge marketplace:

1. **Expert System** (Sean's mAgi) - Knowledge provider & revenue recipient
2. **Client System** (Igor's mAgi) - Knowledge seeker & payment source  
3. **Marketplace Platform** (AGIfor.me Network) - Facilitator, payment processor, quality controller

## Prerequisites
- Three system instances or VMs with AGIfor.me installed
- Payment processing sandbox (Stripe test mode)
- Expert verification system (mock credentials)
- Network connectivity between all systems

## Setup Phase

### 1. Deploy Three-System Architecture

**System A - Expert (Sean Rodriguez, Business Attorney)**:
```bash
# Clone and setup expert system
git clone https://github.com/yourusername/agiforme sean-expert-magi
cd sean-expert-magi
npm install
./setup.sh

# Configure as expert marketplace provider
echo "MAGI_TYPE=expert" >> .env
echo "MAGI_ID=sean-legal.expert" >> .env
echo "EXPERT_SPECIALTIES=software_licensing,startup_law,employment_law" >> .env
echo "MARKETPLACE_ENABLED=true" >> .env
echo "PAYMENT_PROVIDER=stripe" >> .env
echo "STRIPE_ACCOUNT_ID=acct_test_expert_123" >> .env

# Start expert marketplace mode
./start.sh --expert-mode
```

**System B - Client (Igor, Startup Founder)**:  
```bash
# Clone and setup client system
git clone https://github.com/yourusername/agiforme igor-client-magi
cd igor-client-magi
npm install
./setup.sh

# Configure as marketplace client
echo "MAGI_TYPE=client" >> .env
echo "MAGI_ID=igor-startup.local" >> .env
echo "MARKETPLACE_ENABLED=true" >> .env
echo "PAYMENT_METHOD=stripe" >> .env
echo "STRIPE_CUSTOMER_ID=cus_test_client_123" >> .env

# Start client mode
./start.sh --client-mode
```

**System C - Marketplace Platform (AGIfor.me Network)**:
```bash
# Clone and setup marketplace platform
git clone https://github.com/yourusername/agiforme marketplace-platform
cd marketplace-platform
npm install
./setup.sh

# Configure as marketplace hub
echo "MAGI_TYPE=marketplace" >> .env
echo "NETWORK_HUB=true" >> .env
echo "EXPERT_VERIFICATION=true" >> .env
echo "PAYMENT_PROCESSING=true" >> .env
echo "STRIPE_PLATFORM_ACCOUNT=acct_platform_123" >> .env

# Start marketplace platform
./start.sh --marketplace-mode
```

### 2. Create Test Memories & Configuration

**In Expert System (Sean)** - Load expert memories from test-data.md:
- `memories/professional/expert-profile.md`
- `memories/expertise/software-licensing/licensing-strategies.md`
- `memories/professional/client-cases.md`
- Marketplace pricing configuration
- Quality standards and response templates

**In Client System (Igor)** - Load client context from test-data.md:
- `memories/business/agiforme-licensing-decision.md`
- `memories/business/competitor-analysis.md`
- Payment method configuration
- Budget constraints and decision criteria

**In Marketplace Platform** - Configure systems integration:
- Expert verification records
- Payment processing setup
- Revenue sharing configuration
- Quality monitoring systems

### 3. Expert Registration & Verification

**Step 1 - Expert Application**:
```bash
# Sean submits expert application
curl -X POST localhost:8000/marketplace/expert/apply \
  -H "Content-Type: application/json" \
  -d '{
    "magi_id": "sean-legal.expert",
    "name": "Sean Rodriguez",
    "title": "Business Attorney", 
    "credentials": {
      "bar_license": "CA State Bar #123456",
      "education": "JD Stanford Law 2015",
      "years_experience": 8
    },
    "specialties": [
      {"domain": "software_licensing", "confidence": 5},
      {"domain": "startup_law", "confidence": 5},  
      {"domain": "employment_law", "confidence": 4}
    ],
    "pricing": {
      "simple_query": 25,
      "medium_query": 50,
      "complex_query": 100,
      "monthly_subscription": 149
    },
    "sample_responses": "..." 
  }'
```

**Step 2 - Mock Verification Process**:
```bash
# Platform verifies expert credentials (simulated)
curl -X POST localhost:8000/marketplace/expert/verify \
  -H "Content-Type: application/json" \
  -d '{
    "expert_id": "sean-legal.expert",
    "verification_status": "approved",
    "credential_checks": {
      "bar_license": "verified",
      "education": "verified", 
      "background_check": "passed"
    },
    "peer_reviews": [
      {"rating": 4.8, "reviewer": "expert_456"},
      {"rating": 4.9, "reviewer": "expert_789"}
    ]
  }'
```

**Step 3 - Expert Goes Live**:
```bash
# Check expert is listed in marketplace
curl localhost:8000/marketplace/experts/search?specialty=software_licensing

# Should return Sean's profile with verified status
```

## Testing Scenarios

### Scenario 1: Successful Pay-Per-Query Consultation

**Test Flow**:
1. Client requests expert advice on licensing
2. Marketplace matches client with appropriate expert  
3. Payment processing and authorization
4. Expert receives consultation request
5. Expert provides detailed response
6. Client receives advice and payment is settled
7. Both parties rate the interaction

**Step 1 - Client Initiates Request**:
```bash
# Igor asks his mAgi for licensing advice
curl -X POST localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need expert legal advice on software licensing for AGIfor.me. Budget around $25-50.",
    "context": {
      "urgency": "normal",
      "complexity": "medium",
      "budget_max": 50
    }
  }'

# Igor's mAgi should:
# 1. Recognize this needs expert consultation
# 2. Search marketplace for licensing experts
# 3. Present Sean as top match
# 4. Offer to initiate paid consultation
```

**Step 2 - Marketplace Matching & Pricing**:
```bash  
# Check marketplace matching logic
curl localhost:8000/marketplace/match \
  -H "Content-Type: application/json" \
  -d '{
    "query_type": "software_licensing",
    "complexity": "medium", 
    "budget_range": [25, 50],
    "urgency": "normal"
  }'

# Should return Sean as top match with $25-50 pricing
```

**Step 3 - Payment Authorization**:
```bash
# Igor approves consultation and payment
curl -X POST localhost:3001/marketplace/consult \
  -H "Content-Type: application/json" \
  -d '{
    "expert_id": "sean-legal.expert",
    "consultation_type": "medium_complexity",
    "max_fee": 50,
    "query": {
      "subject": "Software licensing strategy for dual-use product",
      "details": "Building AGIfor.me, need both open source adoption and commercial revenue. ChatGPT suggested AGPL v3 but concerned about commercial implications.",
      "context": "Early-stage startup, first product, solo founder"
    },
    "payment_method": "card_test_4242424242424242"
  }'

# Should return consultation_id and payment authorization
```

**Step 4 - Expert Receives & Responds**:
```bash
# Sean checks for new consultation requests
curl localhost:4001/marketplace/consultations/pending

# Sean provides expert response
curl -X POST localhost:4001/marketplace/consultations/respond \
  -H "Content-Type: application/json" \
  -d '{
    "consultation_id": "cons_20240225_001",
    "response": {
      "executive_summary": "AGPL v3 is wrong for your use case. Recommend MIT + Commercial dual license.",
      "detailed_analysis": "AGPL creates commercial poison pill effect...",
      "recommendations": "1. Use MIT for open source version 2. Create commercial license for enterprise...",
      "precedents": "MongoDB, Elastic, Redis all moved away from pure open source...",
      "next_steps": "1. Draft dual license terms 2. Set commercial thresholds..."
    },
    "time_spent_minutes": 47,
    "follow_up_included": true
  }'
```

**Step 5 - Payment Settlement & Ratings**:
```bash
# Platform processes payment and revenue split
curl -X POST localhost:8000/marketplace/settlements/process \
  -d '{
    "consultation_id": "cons_20240225_001",
    "fee_total": 25.00,
    "expert_share": 20.00,
    "platform_share": 3.00,
    "processing_fee": 1.50,
    "network_cost": 0.50
  }'

# Client rates the consultation
curl -X POST localhost:3001/marketplace/rate \
  -d '{
    "consultation_id": "cons_20240225_001", 
    "ratings": {
      "response_quality": 5,
      "value_for_money": 5,
      "response_speed": 4,
      "likelihood_recommend": 5
    },
    "comment": "Excellent advice with real business context. Worth every penny."
  }'
```

**Expected Results**:
- ✅ Client gets actionable expert advice contradicting generic AI
- ✅ Expert receives $20 revenue for 47-minute consultation  
- ✅ Platform facilitates transaction and takes reasonable cut
- ✅ Both parties satisfied with value exchange
- ✅ Expert's reputation score increases

### Scenario 2: Monthly Subscription Access

**Test Flow**:
1. Client subscribes to expert's monthly access tier
2. Unlimited questions within subscription period
3. Priority response times and additional benefits
4. Subscription renewal or cancellation handling

**Step 1 - Subscription Purchase**:
```bash
curl -X POST localhost:3001/marketplace/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "expert_id": "sean-legal.expert",
    "plan": "monthly_access",
    "price": 149.00,
    "payment_method": "card_test_4242424242424242",
    "auto_renew": true
  }'
```

**Step 2 - Subscription Benefits Usage**:
```bash
# Multiple queries within subscription
curl -X POST localhost:3001/marketplace/query \
  -d '{
    "expert_id": "sean-legal.expert",
    "query": "Follow-up on licensing: what about patent protection?",
    "subscription_id": "sub_monthly_001",
    "priority": true
  }'

# Should not charge additional fee, expert gets priority notification
```

**Expected Results**:
- ✅ Subscription provides unlimited access for 30 days
- ✅ Expert prioritizes subscription queries (12-hour response)
- ✅ Client gets additional resources (templates, alerts)
- ✅ Recurring revenue for expert and platform

### Scenario 3: Quality Control & Dispute Resolution

**Test Flow**:
1. Client receives subpar expert response
2. Quality control system flags issue
3. Dispute resolution process
4. Expert coaching or penalty as appropriate

**Step 1 - Subpar Response Simulation**:
```bash
# Simulate expert giving poor/generic response
curl -X POST localhost:4001/marketplace/consultations/respond \
  -d '{
    "consultation_id": "cons_20240225_002", 
    "response": {
      "executive_summary": "You should use whatever license works best.",
      "detailed_analysis": "AGPL and MIT are both good options.",
      "recommendations": "Choose based on your needs.",
      "precedents": "Many companies use different licenses."
    },
    "time_spent_minutes": 5,
    "quality_score": 2.1
  }'
```

**Step 2 - Quality Monitoring Detection**:
```bash
# Platform quality system flags low-quality response
curl localhost:8000/marketplace/quality/monitor

# Should detect:
# - Response too generic/vague
# - Time spent too low for complexity
# - No specific precedents cited
# - Missing actionable recommendations
```

**Step 3 - Dispute Resolution**:
```bash
# Client initiates dispute
curl -X POST localhost:3001/marketplace/dispute \
  -d '{
    "consultation_id": "cons_20240225_002",
    "reason": "response_quality",
    "details": "Generic advice without business context. No specific recommendations.",
    "resolution_requested": "refund"
  }'

# Platform reviews and processes
curl -X POST localhost:8000/marketplace/disputes/resolve \
  -d '{
    "dispute_id": "disp_001",
    "resolution": "partial_refund",
    "expert_penalty": "warning",
    "client_credit": 15.00,
    "expert_coaching_required": true
  }'
```

**Expected Results**:
- ✅ Quality control detects subpar responses automatically
- ✅ Fair dispute resolution protects clients
- ✅ Expert coaching maintains marketplace quality
- ✅ Repeat offenders face suspension or removal

### Scenario 4: Expert Network & Referrals

**Test Flow**:
1. Client query outside expert's primary specialty
2. Expert recognizes limitation and refers to colleague
3. Referral tracking and revenue sharing
4. Network effect builds marketplace value

**Step 1 - Outside-Specialty Query**:
```bash
# Client asks licensing expert about tax strategy
curl -X POST localhost:3001/marketplace/query \
  -d '{
    "expert_id": "sean-legal.expert",
    "query": "Tax implications of dual licensing structure for Delaware C-Corp",
    "complexity": "high"
  }'
```

**Step 2 - Expert Referral**:
```bash  
# Sean recognizes this needs tax expert, not legal
curl -X POST localhost:4001/marketplace/refer \
  -d '{
    "consultation_id": "cons_20240225_003",
    "referral_reason": "outside_expertise",
    "recommended_expert": "maria-tax.expert",
    "referral_note": "This needs tax strategy expertise. Maria specializes in corporate tax for tech companies."
  }'
```

**Step 3 - Referral Revenue Sharing**:
```bash
# Client accepts referral and pays Maria
# Sean gets referral fee for professional behavior
curl -X POST localhost:8000/marketplace/referrals/credit \
  -d '{
    "referring_expert": "sean-legal.expert",
    "consultation_fee": 75.00,
    "referral_percentage": 10.0,
    "referral_fee": 7.50
  }'
```

**Expected Results**:
- ✅ Experts stay within competency areas
- ✅ Client gets directed to appropriate specialist  
- ✅ Referral fees incentivize honest referrals
- ✅ Network effects increase marketplace value

## User Experience Validation

### 1. Client Experience Testing
**Natural Conversation Flow**:
```bash
# Test that expert consultation feels natural from client perspective
curl -X POST localhost:3001/chat \
  -d '{
    "message": "I need help choosing the right software license for my startup. I want both open source community and commercial revenue potential."
  }'

# Client's mAgi should:
# 1. Recognize expertise gap in own knowledge
# 2. Suggest expert consultation option
# 3. Present expert options with ratings/pricing
# 4. Handle payment seamlessly
# 5. Deliver expert response in digestible format
# 6. Offer follow-up options
```

**Expected Client Experience**:
- ✅ Feels like natural extension of personal mAgi
- ✅ Clear value proposition for paid expertise
- ✅ Transparent pricing and expert qualifications
- ✅ Seamless payment without friction
- ✅ Expert advice clearly differentiated from AI
- ✅ Actionable recommendations with real business context

### 2. Expert Experience Testing
**Expert Workflow Validation**:
```bash
# Test expert's consultation management experience
curl localhost:4001/marketplace/dashboard

# Expert should see:
# - Pending consultations with context
# - Revenue analytics and projections
# - Rating trends and feedback
# - Referral opportunities
# - Quality scores and coaching suggestions
```

**Expected Expert Experience**:
- ✅ Clear consultation queue with good context
- ✅ Fair compensation for time invested
- ✅ Reputation building through quality work
- ✅ Revenue analytics for business planning
- ✅ Professional development through feedback

## Success Criteria

### ✅ Technical Integration
- [ ] Three-system architecture communicates reliably
- [ ] Payment processing handles edge cases (failures, disputes)
- [ ] Quality monitoring detects subpar responses
- [ ] Expert verification prevents credential fraud
- [ ] Revenue sharing mathematics are accurate

### ✅ Business Model Validation  
- [ ] Experts find pricing sustainable for quality work
- [ ] Clients perceive clear value over generic AI advice
- [ ] Platform revenue covers operational costs
- [ ] Quality control maintains marketplace reputation
- [ ] Network effects encourage expert participation

### ✅ User Experience
- [ ] Clients get better advice than free alternatives
- [ ] Expert consultation feels seamless and natural
- [ ] Payment friction is minimal
- [ ] Dispute resolution feels fair to both parties
- [ ] Ratings and reviews build trust over time

### ✅ Marketplace Dynamics
- [ ] High-quality experts attract repeat clients
- [ ] Poor-quality experts are filtered out naturally
- [ ] Referral network creates value for specialists
- [ ] Pricing finds sustainable equilibrium
- [ ] Community grows through word-of-mouth

## Troubleshooting

### Common Issues
- **Payment processing failures**: Check Stripe webhook configuration
- **Expert not receiving notifications**: Verify mAgi network connectivity  
- **Quality scores inaccurate**: Review automated assessment algorithms
- **Revenue splits incorrect**: Validate marketplace fee calculations

### Debug Commands
```bash
# Check marketplace connectivity
curl localhost:8000/marketplace/status

# Verify expert registration  
curl localhost:8000/marketplace/experts/sean-legal.expert

# Review consultation history
curl localhost:8000/marketplace/consultations?expert=sean-legal.expert

# Monitor payment processing
tail -f logs/payments.log
```

## Expected Demo Outcome

After successful testing, you should be able to demonstrate:

1. **Knowledge Marketplace in Action**: Real expert providing better advice than generic AI
2. **Sustainable Economics**: Fair pricing that works for experts, clients, and platform
3. **Quality Control**: System maintains high standards through verification and monitoring
4. **Network Effects**: Referrals and reputation building create marketplace value
5. **Seamless Integration**: Expert consultation feels natural within personal mAgi experience

This validates the **monetization potential** of AGIfor.me as a platform for expert knowledge sharing and the **value proposition** of human expertise enhanced by AI systems.