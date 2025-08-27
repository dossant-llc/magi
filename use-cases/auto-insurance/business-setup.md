# Business Setup: ACME Insurance

## Company Profile
- **Name**: ACME Insurance  
- **Business Type**: Auto Insurance Provider
- **Integration Goal**: Replace lengthy forms with mAgi data requests
- **Privacy Commitment**: Transparent data requests, automatic data deletion

## Technical Integration

### API Configuration
```json
{
  "business_id": "acme-insurance",
  "company_name": "ACME Insurance", 
  "domain": "acme-insurance.com",
  "contact_email": "privacy@acme-insurance.com",
  "data_retention": "24_hours",
  "auto_delete": true
}
```

### Data Request Schema
```json
{
  "intent": "auto_insurance_quote",
  "description": "Generate personalized auto insurance quote",
  "data_categories": [
    {
      "category": "driving_record", 
      "required": true,
      "description": "Driving history for risk assessment"
    },
    {
      "category": "vehicle_info",
      "required": true, 
      "description": "Vehicle details for coverage calculation"
    },
    {
      "category": "coverage_preferences",
      "required": false,
      "description": "Previous research and preferences"
    },
    {
      "category": "budget_range",
      "required": false,
      "description": "Budget constraints for appropriate options"
    }
  ],
  "privacy_levels": ["team", "personal"],
  "duration": "24_hours",
  "purpose": "Provide accurate insurance quote without forms"
}
```

### Expected Response Format
```typescript
interface InsuranceProfile {
  driving_profile: {
    years_experience: number;
    accidents_5yr: number;
    violations_5yr: number;
    annual_mileage: number;
    primary_use: 'commuting' | 'pleasure' | 'business';
  };
  vehicle_info: {
    year: number;
    make: string;
    model: string;
    safety_rating?: string;
    anti_theft?: boolean;
  };
  coverage_preferences?: {
    deductible_preference: 'low' | 'moderate' | 'high';
    coverage_priority: string[];
    payment_frequency: 'monthly' | 'quarterly' | 'annual';
  };
  context_notes?: string[];
}
```

## Business Logic

### Quote Calculation
Based on received mAgi data:
1. **Base rate calculation** using driving record and vehicle info
2. **Discount application** for safety features and clean record  
3. **Personalization** based on preferences and context
4. **Recommendation engine** for coverage options

### Privacy Handling
- Request only necessary data categories
- Respect user's sharing preferences  
- Auto-delete data after quote expires
- Provide clear explanation of data usage