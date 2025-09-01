# Test Data Setup

## Required Memory Files

Create these files in your `memories/` folder to test the auto insurance scenario:

### 1. Driving Record (`memories/team/driving-record.md`)
```markdown
---
privacy: team
tags: [driving, record, violations, experience]
created: 2024-01-15
---

# My Driving Record

## Experience
- Licensed since: March 2012 (12 years experience)
- Total miles driven: ~102,000 miles
- Primary vehicle use: Daily commuting to office

## Violations (Last 5 Years)
- **2022-08-15**: Speeding violation
  - Location: Highway 101 near Mountain View
  - Speed: 80 mph in 65 mph zone (15 over)
  - Fine: $185, paid in full
  - No traffic school attended

## Accidents (Last 5 Years)
- None

## Training & Certifications
- **2023-03-10**: Completed defensive driving course
- **2020-12-01**: Completed online traffic school
```

### 2. Vehicle Information (`memories/private/vehicle-info.md`)
```markdown
---
privacy: private
tags: [vehicle, car, honda, civic, insurance]
created: 2024-01-10
---

# Current Vehicle Information

## 2019 Honda Civic Sedan
- **Purchase Date**: June 2019
- **Mileage**: 52,000 miles (as of Jan 2024)
- **VIN**: [REDACTED - for insurance only]
- **Annual Mileage**: ~8,500 miles/year

## Safety & Security Features
- **Safety Rating**: IIHS Top Safety Pick, 5-star NHTSA
- **Anti-theft**: Factory alarm system + steering wheel lock
- **Safety Features**: 
  - Honda Sensing suite (collision mitigation, lane keeping)
  - Backup camera
  - Blind spot monitoring

## Usage Patterns
- **Primary Use**: Commuting to office (24 miles round trip)
- **Secondary**: Weekend errands, occasional road trips
- **Parking**: Covered parking at home, office parking garage
```

### 3. Insurance Research (`memories/personal/insurance-research.md`)
```markdown
---
privacy: personal
tags: [insurance, research, quotes, preferences]
created: 2024-01-20
---

# Auto Insurance Research 2024

## Coverage Preferences
- **Deductible**: Prefer $500-1000 range (not too low, not too high)
- **Coverage Priority**: 
  1. Collision coverage (high priority)
  2. Comprehensive coverage (medium-high priority)  
  3. Uninsured motorist (important in CA)
  4. Rental car coverage (nice to have)

## Payment Preferences
- **Frequency**: Monthly payments preferred over lump sum
- **Auto-pay**: Yes, with credit card for rewards points
- **Discounts**: Interested in safe driver, multi-policy discounts

## Research Notes
- **Budget Range**: Targeting $100-150/month for full coverage
- **Company Preferences**: 
  - Good customer service ratings (4+ stars)
  - Easy claims process
  - Local agents available
  - Transparent pricing (no hidden fees)

## Companies Researched
- State Farm: Good service, higher prices
- Geico: Lower prices, mixed service reviews  
- Progressive: Usage-based options available
- Allstate: Local agents, competitive rates
```

### 4. Budget Constraints (`memories/sensitive/financial-limits.md`)
```markdown
---
privacy: sensitive
tags: [budget, financial, limits, insurance]
created: 2024-01-18
---

# Insurance Budget Constraints

## Monthly Budget
- **Maximum**: $130/month for auto insurance
- **Preferred**: $110-120/month range
- **Context**: Total transportation budget is $400/month

## Financial Considerations
- Currently paying $135/month with current provider
- Looking to reduce costs without sacrificing coverage
- Can pay higher deductible to lower monthly premium
- Have emergency fund to cover up to $1000 deductible

## Household Context
- Single income household
- Other insurance costs: $85/month health, $25/month renters
- Prefer predictable monthly costs over variable pricing
```

## Mock Business Response

Expected filtered data that ACME Insurance would receive:

```json
{
  "driving_profile": {
    "years_experience": 12,
    "accidents_5yr": 0,
    "violations_5yr": 1,
    "violation_type": "speeding_minor", 
    "annual_mileage": 8500,
    "primary_use": "commuting"
  },
  "vehicle_info": {
    "year": 2019,
    "make": "Honda", 
    "model": "Civic",
    "safety_rating": "5_star_iihs_top_pick",
    "anti_theft": true,
    "safety_features": ["collision_mitigation", "lane_keeping", "blind_spot"]
  },
  "coverage_preferences": {
    "deductible_preference": "moderate",
    "coverage_priority": ["collision", "comprehensive", "uninsured_motorist"],
    "payment_frequency": "monthly",
    "discount_interests": ["safe_driver", "multi_policy"]
  },
  "context_notes": [
    "Values good customer service and transparent pricing",
    "Prefers predictable monthly costs",
    "Interested in local agent availability",
    "Has emergency fund for higher deductibles"
  ]
}
```

## Privacy Filtering Applied

**Data Shared** ✅:
- Driving experience and record summary
- Vehicle safety features (affects rates positively)
- Coverage preferences and priorities  
- General budget tier indicator

**Data Protected** ❌:
- Exact budget numbers ($130 max)
- Specific financial constraints
- Which other companies being considered
- Household income context
- Exact vehicle VIN