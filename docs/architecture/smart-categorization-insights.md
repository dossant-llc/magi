---
privacy: public
tags: [smart-categorization, ai-classification, ux-design, privacy]
created: 2025-08-23
share_freely: true
---

# Smart Categorization - Design Insights

Key insights from designing an AI system that automatically categorizes personal knowledge by privacy level.

## 🧠 The Core UX Challenge

**Problem**: Users accumulate valuable knowledge but manual categorization kills adoption.

**Insight**: People naturally think "who should see this?" before "where should this go?"

**Solution**: AI analyzes content for privacy level, user confirms when uncertain.

## 🎯 Classification Strategy

### High Confidence Auto-Classification
**When AI is 80%+ confident, just do it:**

- `"Git rebase keeps history clean"` → **public** (general programming tip)
- `"Our deployment uses Docker"` → **team** (company process)  
- `"Client X wants Q4 expansion"` → **private** (business sensitive)
- `"Incident response contacts: [list]"` → **sensitive** (security critical)

### User Confirmation for Uncertainty  
**When AI is <80% confident, ask user:**

```
🤔 "Our incident response procedure needs updating"
   Could be: team/ (process) or sensitive/ (security)?
   You: "Security - contains emergency contacts"
   ✅ Learning: "incident response" + "emergency contacts" = sensitive/
```

## 🔍 Privacy Detection Patterns

### Strong Privacy Indicators
- **Sensitive keywords**: `incident`, `security`, `confidential`, `emergency`
- **Personal pronouns**: `my client`, `our company`, `my salary`
- **Specific entities**: Company names, client names, IP addresses
- **Context clues**: `don't share this`, `internal only`, `personal note`

### Public Knowledge Signals  
- **General concepts**: `debugging`, `programming`, `best practices`
- **Educational tone**: `how to`, `tips for`, `I learned that`
- **No personal/business context**: Pure technical or philosophical content
- **Shareable insights**: Would be comfortable in blog post

### Ambiguous Cases (Need User Input)
- **Pronouns without context**: `we`, `our`, `they` (who specifically?)
- **Mixed content**: Technical tip + company-specific detail
- **New terminology**: Industry jargon or personal shorthand
- **Implied sensitivity**: Content user might not realize is sensitive

## 🎮 User Control Design

### Always User-Controllable
- ✅ **Override any suggestion** at capture time
- ✅ **Recategorize later** via web interface  
- ✅ **Set personal rules**: `anything with 'Client X' → private/`
- ✅ **Bulk operations**: Recategorize multiple files at once

### Smart Defaults Based on Learning
```typescript
// System learns user preferences:
const userPatterns = {
  "client meetings" → user always chooses private/,
  "debugging tips" → user always accepts public/,  
  "team processes" → user sometimes chooses private/ instead of team/
}

// Adjust future suggestions:
confidenceBoost = userPatterns.match(content) ? 0.2 : 0.0
```

## 📊 Confidence Calibration

### What Builds Confidence
- **Keyword exactness**: `security incident` vs `incident` vs `security`
- **Pattern recognition**: Similar content user has categorized before
- **Context clarity**: Clear business vs personal vs technical signals
- **User feedback**: Previous corrections teach system

### What Lowers Confidence
- **Ambiguous pronouns**: Could refer to different entities
- **Mixed contexts**: Personal + professional in same content
- **New vocabulary**: Terms not seen in training examples
- **Contradictory signals**: Technical content with personal pronouns

### Confidence Thresholds
- **90%+**: Auto-categorize with brief notification
- **70-89%**: Auto-categorize with clear explanation  
- **50-69%**: Show suggestion, ask for confirmation
- **<50%**: Present options, ask user to choose

## 🔄 Learning System Design

### Feedback Loop
```typescript
interface LearningEvent {
  originalContent: string
  aiSuggestion: { level: string, confidence: number }
  userChoice: string
  userReasoning?: string  // Why AI was wrong
  timestamp: Date
}

// Pattern recognition improves over time:
// "incident response" → sensitive/ (95% after user corrections)
// "client strategy" → private/ (user preference learned)
```

### Personal Preference Categories
- **Conservative user**: Prefers more restrictive privacy levels
- **Open user**: Comfortable sharing more broadly
- **Context-sensitive user**: Decisions vary by content domain
- **Business-focused user**: Strong separation between work/personal

## ⚠️ Privacy-First Design Principles

### Conservative Bias
- **When uncertain, choose more restrictive privacy level**
- **Better to ask user than accidentally expose sensitive info**  
- **"Privacy leak" destroys trust, "over-protection" just requires correction**

### Explicit Sensitivity Detection
- **Flag potential PII**: Names, addresses, phone numbers, emails
- **Detect credentials**: Passwords, API keys, tokens (never store these!)
- **Business sensitive**: Client names, revenue numbers, strategic plans
- **Personal sensitive**: Health info, family details, financial data

### User Education
- **Show reasoning**: Why AI chose specific privacy level
- **Highlight risks**: What happens if this level is wrong
- **Provide examples**: Good vs problematic content for each level

## 📈 Success Metrics

### User Experience Success
- **Capture time**: <10 seconds from thought to stored knowledge
- **Acceptance rate**: 90%+ of AI suggestions accepted by user
- **User satisfaction**: Reports feeling "in control" not "correcting AI"

### Privacy Protection Success  
- **Zero exposures**: No sensitive content accidentally marked public
- **User confidence**: Trust that system protects their interests
- **Audit transparency**: Complete visibility into what got shared when

### Learning System Success
- **Accuracy improvement**: 5%+ better per 100 user corrections
- **Personalization**: Learns user's specific privacy preferences
- **Reduced friction**: Fewer confirmation prompts over time

## 🚀 Implementation Insights

### Phase 1: Rule-Based Classification
**Start simple**: Keyword matching + confidence scoring
- Easy to debug and explain to users
- Fast execution, no model loading
- Foundation for learning more complex patterns

### Phase 2: Enhanced AI Classification
**Add sophistication**: Local language models for better context understanding
- Semantic analysis beyond keyword matching  
- Better handling of ambiguous cases
- Still runs locally for privacy

### Phase 3: Predictive Features
**Proactive assistance**: Suggest related knowledge, predict privacy drift
- "This looks related to [existing knowledge]"
- "Content doesn't match file's privacy level - recategorize?"
- Smart suggestions for knowledge connections

---

## 🎓 Key Design Insights

### 1. **Confidence Scoring is Critical**
Users need to understand AI uncertainty. Showing confidence builds trust and guides when to ask for help.

### 2. **Learning from Corrections is Essential**  
Every user has different privacy preferences. System must adapt to individual patterns, not assume universal rules.

### 3. **Conservative Bias Prevents Disasters**
Better to over-protect and require user correction than under-protect and lose trust forever.

### 4. **Context Matters More Than Keywords**
`"client meeting"` could be public (general advice) or private (specific business). Context analysis crucial.

### 5. **User Control Must Be Real**
If users can't easily override AI decisions, they'll lose confidence in system. Make correction effortless.

---

*This knowledge demonstrates the system's value - capturing complex design insights for future reference and community learning.*