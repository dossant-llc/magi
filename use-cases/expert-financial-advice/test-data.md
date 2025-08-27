# Test Data: Expert Marketplace Scenario

## Overview
This test requires **three systems** to simulate the complete marketplace:
1. **Expert's mAgi** (Sean - Knowledge provider)
2. **Client's mAgi** (Igor - Knowledge seeker)  
3. **Marketplace Platform** (AGIfor.me Network - Facilitator & payment processor)

## Expert's Test Memories (Sean Rodriguez, Business Attorney)

### 1. Professional Profile (`memories/professional/expert-profile.md`)
```markdown
---
privacy: public  
tags: [professional, credentials, expertise, marketplace]
created: 2024-01-15
---

# Sean Rodriguez - Business Attorney Profile

## Credentials & Verification
- **California State Bar**: #123456 (Active, good standing)
- **Education**: JD Stanford Law School (2015)
- **Years Experience**: 8+ years business and startup law
- **Current Practice**: Senior Associate, TechLaw Partners LLP

## Verified Specializations
### Software Licensing & IP Strategy ⭐⭐⭐⭐⭐
- **Experience**: 8 years, 100+ licensing deals structured
- **Notable Work**: Advised on MongoDB SSPL transition, 12 startup IPO legal prep
- **Key Insight**: "Most developers don't understand business implications of license choice"
- **Common Mistake**: "AGPL kills commercial adoption - I've seen it happen 20+ times"

### Startup Legal Structures ⭐⭐⭐⭐⭐  
- **Experience**: 8 years, 200+ companies incorporated
- **Notable Work**: Legal counsel for 3 unicorn startups, 40+ Series A rounds
- **Key Insight**: "Equity structure mistakes in early stages cost millions later"
- **Common Mistake**: "Equal founder splits without vesting schedules"

### Employment Law ⭐⭐⭐⭐
- **Experience**: 6 years, focus on equity compensation
- **Notable Work**: Structured equity for 50+ startups, resolved 30+ disputes
- **Key Insight**: "California employment law is startups' biggest landmine"
- **Common Mistake**: "Classifying contractors as employees incorrectly"

## Marketplace Stats (Last 12 Months)
- **Total Consultations**: 127 completed
- **Average Rating**: 4.9/5.0
- **Response Time**: Average 3.2 hours (98% under 24 hours)
- **Revenue Generated**: $12,400 platform total
- **Client Retention**: 78% use services again
- **Peer Endorsements**: 8 from other verified experts

## Pricing Structure
- **Simple Queries**: $15-25 (quick clarifications, simple yes/no)
- **Medium Complexity**: $25-50 (detailed analysis, recommendations)  
- **Complex Strategy**: $50-100 (comprehensive planning, multiple options)
- **Monthly Access**: $149/month (unlimited questions, 12-hour response)
- **Annual VIP**: $999/year (quarterly strategy calls, custom research)
```

### 2. Licensing Expertise (`memories/expertise/software-licensing/licensing-strategies.md`)
```markdown
---
privacy: professional
tags: [licensing, strategy, software, business, precedents]
created: 2024-01-10
updated: 2024-02-20
---

# Software Licensing Strategy Knowledge Base

## License Types & Business Impact

### AGPL v3 - The "Commercial Poison"
**When to Use**: Almost never for commercial products
**Business Impact**: Kills enterprise adoption, limits funding options
**Real Cases**:
- **Client A (2022)**: Lost $2M enterprise deal because customer couldn't touch AGPL code
- **Client B (2023)**: Had to dual-license retroactively, cost $50K in legal fees
- **Industry Example**: MongoDB abandoned AGPL for SSPL for exactly this reason

**Why LLMs Recommend It**: Pattern matching on "strong copyleft" without business context

### MIT License - The "Business Friendly"  
**When to Use**: Maximum adoption, minimal legal friction
**Business Impact**: Easy commercial adoption but less protection from competitors
**Strategy**: Great for developer tools, APIs, foundational libraries
**Dual License Approach**: MIT for personal/research + Commercial license for business use

### SSPL (Server Side Public License) - The "SaaS Protector"
**When to Use**: When you want to prevent cloud providers from competing with you
**Business Impact**: Forces competitors to open source their modifications OR pay for commercial license
**Real Cases**: 
- **MongoDB**: Revenue increased 40% after SSPL transition (despite initial community backlash)
- **Elastic**: Successfully forced AWS to negotiate commercial terms
- **Redis Labs**: Prevented AWS from commoditizing Redis

### Business Source License (BSL) - The "Time Delayed Open Source"
**When to Use**: Want source availability but protection during commercial phase
**Business Impact**: Source available for review, becomes truly open source after 3-4 years
**Strategy**: Good for funded startups competing against incumbents

## Dual Licensing Strategies

### The "MongoDB Model" (SSPL + Commercial)
```
Open Source: SSPL (free for non-competing use)
Commercial: Traditional license (paid for competing/proprietary use)
Revenue Split: ~60% commercial, ~40% open source services
```

### The "MIT + Commercial" Model (Recommended for Most)
```  
Open Source: MIT (free for personal/research/internal use)
Commercial: Proprietary license (paid for redistribution/SaaS/enterprise)
Revenue Split: ~80% commercial, ~20% open source services
```

### The "Elastic Model" (Elastic License + Commercial)
```
Source Available: Elastic License (can view/modify, can't compete)
Commercial: Full rights license (paid for competing use)
Revenue Split: ~70% commercial, ~30% services/support
```

## Common Licensing Mistakes & Solutions

### Mistake #1: "Let's Use AGPL to Force Contributions"
**Reality**: AGPL doesn't force contributions, it forces avoidance
**Solution**: Use contributor license agreements (CLAs) + permissive license
**Evidence**: 15 clients tried this, all regretted it within 18 months

### Mistake #2: "We'll Figure Out Commercial Licensing Later"  
**Reality**: Retroactive licensing is legal nightmare, expensive, kills momentum
**Solution**: Decide dual-license strategy before first public release
**Evidence**: 8 clients had to spend $30K-100K on retroactive licensing cleanup

### Mistake #3: "Just Copy What [BigCo] Does"
**Reality**: Large companies have different constraints than startups
**Solution**: Choose license based on YOUR business model and stage
**Evidence**: 5 clients copied Facebook's license, regretted it during funding rounds

## Current Legal Landscape (2024)

### Funding Impact of License Choice
- **VC-Friendly**: MIT, Apache 2.0, BSD
- **VC-Neutral**: SSPL, BSL, custom dual licenses
- **VC-Concerning**: AGPL, GPL v3, highly restrictive licenses

### Enterprise Procurement Guidelines  
- **Auto-Approved**: MIT, Apache 2.0, BSD
- **Legal Review Required**: SSPL, custom licenses, dual licenses
- **Usually Rejected**: AGPL, GPL v3 (for SaaS/cloud companies)

### Cloud Provider Responses
- **AWS**: Offers commercial alternatives to SSPL projects (DocumentDB vs MongoDB)
- **Google Cloud**: Generally negotiates commercial licenses for SSPL
- **Microsoft Azure**: Often partners directly rather than compete

## Template Responses for Common Scenarios

### "What license should I choose for my SaaS startup?"
**Analysis Framework**:
1. Do you want maximum adoption? → MIT + Commercial dual license
2. Do you need protection from cloud competitors? → SSPL + Commercial  
3. Are you building developer tools? → MIT or Apache 2.0
4. Do you have funded competitors? → Consider BSL

**Default Recommendation**: MIT + Commercial dual license
**Reasoning**: Maximizes community adoption while preserving commercial revenue opportunities
```

### 3. Client Case Studies (`memories/professional/client-cases.md`)
```markdown
---
privacy: private
tags: [clients, cases, outcomes, lessons]
created: 2024-01-05
updated: 2024-02-25
---

# Client Case Studies & Outcomes (Anonymized)

## Software Licensing Cases

### Case #1: "The AGPL Disaster" (2022)
**Client**: B2B SaaS startup, Series A stage
**Problem**: Used AGPL v3 on advice of technical co-founder
**Impact**: Lost 3 enterprise deals worth $2M total ARR
**Solution**: Dual-licensed to MIT + Commercial, grandfathered existing users
**Cost**: $45K legal fees, 6 months delay, damaged reputation
**Lesson**: AGPL is commercial poison for B2B SaaS
**Current Status**: Now $5M ARR, successful Series B

### Case #2: "The MongoDB Copycat" (2023)
**Client**: Database startup competing with MongoDB  
**Problem**: Wanted to use SSPL but VCs were concerned
**Solution**: Modified BSL with 3-year conversion to Apache 2.0
**Impact**: Successful $15M Series A, clear competitive protection
**Lesson**: Investors understand licensing strategy when properly explained
**Current Status**: Growing 300% YoY, considering IPO path

### Case #3: "The Retroactive Nightmare" (2022)  
**Client**: Developer tools company, 50K+ users
**Problem**: Started with MIT, wanted to add commercial restrictions
**Solution**: Dual-licensed new versions, grandfathered existing
**Cost**: $80K legal fees, community backlash, 6-month distraction
**Lesson**: Plan commercial licensing from day one
**Current Status**: $8M ARR, successful commercial licensing program

## Startup Structure Cases

### Case #4: "The Equal Split Disaster" (2021)
**Client**: 3-founder SaaS company
**Problem**: Equal 33/33/33 split, no vesting, one founder left after 6 months  
**Impact**: Departed founder owned 33% of company despite minimal contribution
**Solution**: Expensive buyback negotiation, restructured remaining equity
**Cost**: $200K buyback + $30K legal fees
**Lesson**: Always use vesting schedules, even for co-founders
**Current Status**: Successful $20M exit (remaining founders)

### Case #5: "The Contractor Misclassification" (2023)
**Client**: AI startup, 20 employees
**Problem**: Classified 8 engineers as contractors to save on benefits
**Impact**: California Labor Department investigation, $500K penalty
**Solution**: Reclassified employees, implemented compliant HR practices
**Lesson**: California employment law doesn't care about your cash flow
**Current Status**: Compliant, raised Series A successfully

## Investment & Equity Cases

### Case #6: "The Advisor Equity Explosion" (2022)
**Client**: Consumer app startup
**Problem**: Gave 5% equity to 10 advisors (50% total!)
**Impact**: No equity pool left for employees, funding round complicated
**Solution**: Negotiated equity buybacks, restructured advisor arrangements  
**Cost**: $150K in buybacks, diluted founder equity significantly
**Lesson**: Standard advisor equity is 0.25-1%, not 5%
**Current Status**: Difficult but successful Series A

## Key Success Patterns

### What Works in Licensing
- **Clear dual-license strategy from day one**
- **Business-appropriate license choice (not just "most open")**  
- **Legal review BEFORE public release**
- **Community communication about commercial licensing**

### What Works in Startup Structure  
- **Founder vesting schedules (4-year, 1-year cliff minimum)**
- **Proper employee classification from day one**
- **Conservative advisor equity grants (0.5% standard)**
- **Clean cap table maintenance throughout**

### What Works in Fundraising
- **Licensing strategy that VCs can understand**
- **Employment law compliance (especially California)**
- **Clear IP ownership and assignment agreements**
- **Realistic equity pool sizing (15-20% for employees)**
```

## Client's Test Memories (Igor - AGIfor.me Founder)

### 1. Business Context (`memories/business/agiforme-licensing-decision.md`)
```markdown
---
privacy: private
tags: [agiforme, licensing, strategy, decision]
created: 2024-02-20
---

# AGIfor.me Licensing Strategy Decision

## Current Situation
- Building AGIfor.me: Personal AI memory system with privacy controls
- Want to be open source to build community and trust
- Need commercial licensing path for revenue (enterprise, hosted services)
- Inspired by companies like MongoDB, Elastic that do dual licensing

## Conflicting Advice Received
### ChatGPT/Claude Suggestions
- **AGPL v3**: "Forces derivatives to be open source, protects against competitors"
- **Reasoning**: "Strong copyleft ensures community contributions"
- **Concern**: Feels like generic advice without business context

### Community Forum Advice  
- **MIT**: "Most business-friendly, maximum adoption"
- **Apache 2.0**: "Good for enterprise, includes patent protection"
- **Concern**: Might be too permissive, allows competitors to close source

## Business Goals & Constraints
- **Primary**: Build community trust through open source
- **Secondary**: Enable commercial licensing for enterprise/SaaS
- **Tertiary**: Prevent big tech from taking code and competing directly
- **Stage**: Pre-revenue, pre-funding, solo founder
- **Timeline**: Want to launch publicly in 2-3 months

## Questions for Expert Consultation
1. Is AGPL v3 really "commercial poison" for B2B software?
2. What licensing strategy fits a privacy-focused personal AI tool?
3. How do dual-license strategies work in practice?
4. What are the funding implications of different license choices?
5. How do companies like MongoDB handle open source vs commercial?

## Budget for Legal Advice
- Single consultation: $25-50 (preferred for initial guidance)
- Monthly access: $49-149 (if need ongoing licensing help)
- Will pay more for quality advice that saves expensive mistakes later
```

### 2. Market Research (`memories/business/competitor-analysis.md`)
```markdown
---
privacy: private  
tags: [competitors, analysis, licensing, market]
created: 2024-02-15
---

# Competitive Landscape Analysis

## Direct Competitors (Personal AI Memory)
### Obsidian
- **License**: Proprietary (free personal, paid commercial)
- **Business Model**: Freemium with premium features
- **Strength**: Large community, plugin ecosystem
- **Weakness**: Not AI-native, complex for non-technical users

### Notion AI  
- **License**: Proprietary SaaS
- **Business Model**: Subscription tiers
- **Strength**: Integrated AI, familiar interface
- **Weakness**: No local/private deployment, limited customization

### Logseq
- **License**: AGPL v3
- **Business Model**: ?? (unclear commercial path)
- **Strength**: Local-first, block-based
- **Weakness**: Technical complexity, limited AI features

## Indirect Competitors (Knowledge Management)
### Roam Research
- **License**: Proprietary SaaS  
- **Business Model**: Subscription ($15/month)
- **Note**: Failed to capitalize on early momentum

### RemNote
- **License**: Proprietary (freemium)
- **Business Model**: Subscription tiers
- **Note**: Academic focus, limited business adoption

## Enterprise/Business Focus
### Microsoft Viva
- **License**: Proprietary enterprise
- **Business Model**: Office 365 integration
- **Threat Level**: High (big tech resources)

### Google Workspace AI
- **License**: Proprietary enterprise  
- **Business Model**: Enterprise subscriptions
- **Threat Level**: High (existing user base)

## Key Insights
1. **Most direct competitors are proprietary** - open source could be differentiator
2. **AGPL hasn't helped Logseq build commercial business** - concerning
3. **Big tech threat is real** - need some protection against AWS-ification
4. **Privacy focus is underserved** - opportunity for open source + commercial hosting
```

## Mock Payment & Consultation Flow

### Payment Processing Test Data
```json
{
  "consultation_request": {
    "id": "cons_20240225_001",
    "client_magi": "igor-startup.local",
    "expert_magi": "sean-legal.expert",
    "query_type": "medium_complexity",
    "estimated_fee": 25.00,
    "payment_method": {
      "type": "credit_card",
      "last_four": "4242",
      "exp_month": 12,
      "exp_year": 2025
    },
    "query_details": {
      "subject": "Software licensing strategy for dual-use product",
      "industry": "software/SaaS",
      "complexity": "medium",
      "urgency": "normal",
      "context": "Early-stage startup, first product, need both open source adoption and commercial revenue path"
    }
  },
  "payment_confirmation": {
    "charge_id": "ch_20240225_001",  
    "amount": 25.00,
    "currency": "USD",
    "status": "succeeded",
    "revenue_split": {
      "expert_share": 20.00,
      "platform_share": 3.00,
      "processing_fee": 1.50,
      "network_cost": 0.50
    },
    "consultation_authorized": true,
    "expires_at": "2024-02-26T14:30:00Z"
  }
}
```

### Expected Expert Response Structure
```json
{
  "consultation_response": {
    "id": "cons_20240225_001",
    "expert": "Sean Rodriguez, Business Attorney",
    "query_classification": "medium_complexity",
    "response_time_minutes": 47,
    "billable_amount": 25.00,
    "response_sections": {
      "executive_summary": "AGPL v3 is wrong for your use case. Recommend MIT + Commercial dual license.",
      "detailed_analysis": "...",
      "specific_recommendations": "...",  
      "precedent_examples": "...",
      "next_steps": "...",
      "follow_up_policy": "Clarification questions included in consultation fee"
    },
    "professional_citations": [
      "MongoDB SSPL transition case study",
      "Elastic License v2 precedent",
      "California corporate law precedents"
    ],
    "confidence_level": "high",
    "referrals": [],
    "client_satisfaction_survey": {
      "response_quality": null,
      "value_for_money": null, 
      "likelihood_to_recommend": null,
      "follow_up_needed": null
    }
  }
}
```

This test data provides realistic scenarios for validating the complete marketplace flow from initial request through payment processing to expert response delivery.