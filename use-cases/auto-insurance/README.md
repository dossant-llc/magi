# Auto Insurance Shopping Example

## Overview
**Business Scenario**: Car insurance company wants to provide personalized quotes without lengthy forms  
**User Goal**: Get accurate quotes quickly while controlling data sharing  
**Value Demonstration**: Privacy-controlled personalization at scale  

## Prerequisites
- AGIfor.me system running locally
- Sample driving and vehicle memories populated
- Mock insurance website (or manual testing flow)

## Business Setup

## The Experience

### Step 1: Business Request
You visit **ACME Insurance** website. Instead of a long form, you see:

```
🤖 Get Personalized Quote
Instead of filling out forms, can we ask your mAgi about:
• Your driving history and record
• Vehicle information and usage patterns  
• Coverage preferences and budget range

[Query My mAgi] [Fill Forms Manually]
```

### Step 2: Consent Notification
Your AGIfor.me system shows:

```
🔔 Access Request from ACME Insurance

Requester: ACME Insurance (acme-insurance.com)
Intent: Generate personalized auto insurance quote
They want to know:
• Driving history (accidents, violations, years driving)
• Vehicle info (make, model, year, mileage)
• Coverage preferences (deductible, coverage levels)
• Budget constraints and payment preferences

Privacy levels requested: team, personal
Duration: 24 hours (quote session)

[Allow All] [Customize] [Deny] [View My Data First]
```

### Step 3: Your Decision
You click **[Customize]** and see:

```
✅ Driving record and experience (last 5 years)
✅ Current vehicle information  
✅ Coverage preferences from previous research
❌ Exact budget numbers (keep private)
❌ Personal financial details
❌ Other insurance providers you're considering

Duration: [24 hours ▼]
Auto-expire: ✅ Delete shared data after quote expires

[Approve Customized Access]
```

### Step 4: Your mAgi Responds
ACME Insurance receives (through secure API):

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
    "safety_rating": "5_star",
    "anti_theft": true
  },
  "coverage_preferences": {
    "deductible_preference": "moderate",
    "coverage_priority": ["collision", "comprehensive"],
    "payment_frequency": "monthly"
  },
  "context_notes": [
    "Prefers companies with good customer service ratings",
    "Values transparent pricing over lowest price",
    "Interested in usage-based insurance options"
  ]
}
```

### Step 5: Personalized Results
ACME Insurance instantly provides:

```
🎯 Your Personalized Quote

Based on your mAgi profile:
• Clean driving record discount: -15%
• Honda safety rating bonus: -5%
• Low mileage discount: -8%

Monthly Premium: $127
(Comparable quotes: $140-180)

✨ Special recommendations for you:
• Usage-based insurance available (save up to $20/month)
• Excellent customer service rating (4.8/5 - matches your preferences)
• Transparent pricing guarantee (no hidden fees)

[Get Full Quote] [Compare Options] [Talk to Agent]
```

## Behind the Scenes: Your mAgi's Memory

Your AGIfor.me system found this information from your memories:

**From `/memories/team/driving-record.md`**:
```markdown
# Driving Record
- Licensed since 2012 (12 years experience)
- One speeding ticket in 2022 (15 mph over, paid fine)
- No accidents or claims
- Defensive driving course completed 2023
```

**From `/memories/personal/car-research.md`**:
```markdown  
# Car Insurance Research 2024
- Want moderate deductible ($500-1000)
- Prioritize collision and comprehensive
- Avoid companies with poor customer service
- Interested in usage-based pricing
- Budget range: $100-150/month
```

**From `/memories/private/vehicle-info.md`**:
```markdown
# Current Vehicle
- 2019 Honda Civic (purchased 2019)
- Annual mileage: ~8,500 miles
- Commute: 12 miles each way to office
- Has anti-theft system and 5-star safety rating
```

## Privacy Protection in Action

### What Was Shared ✅
- Driving experience and record (relevant for pricing)
- Vehicle safety and theft protection (affects rates)
- Coverage preferences (helps with recommendations)
- General budget tier (moderate vs premium)

### What Stayed Private ❌
- Exact budget numbers ($130 max)
- Specific employer location (just "commuting")
- Other insurance companies you're considering
- Personal financial details or credit score
- Previous insurance claims history (if sensitive)

## Benefits

### For You
- **Faster quotes**: No 20-minute forms to fill out
- **Better pricing**: Companies see your full positive profile
- **Privacy control**: You decide exactly what to share
- **No repetition**: Visit 5 insurance sites, share data once per approved session

### For ACME Insurance  
- **Higher conversion**: Customers don't abandon long forms
- **Better underwriting**: More complete, accurate customer profiles
- **Personalized service**: Can tailor recommendations to actual preferences
- **Customer trust**: Transparent about what data they want and why

## Technical Implementation

### Security Features
- All data requests go through your local AGIfor.me system
- You approve each request individually
- Data is shared via secure, temporary tokens
- Businesses never get direct access to your memory files
- All interactions are logged for your review

### Integration for Businesses
```javascript
// Business website integration
const magiRequest = {
  business_id: "acme-insurance",
  intent: "auto_insurance_quote",
  data_requested: [
    "driving_record",
    "vehicle_info", 
    "coverage_preferences"
  ],
  duration: "24_hours",
  privacy_levels: ["team", "personal"]
};

// User sees consent notification
// If approved, business receives filtered response
```

This example shows the **future vision** - where your personal AI works as your data guardian and representative, giving you control while enabling personalized experiences.