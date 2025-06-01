# Sequential Chat Test Plan

## Test Scenario: Content Calendar Discussion

**Setup:**
1. Add 3 team members: Jack (Content Writer), Ivy (Marketing Specialist), Grace (Product Designer)
2. Send message: "hey hey, let's talk about content calendar"

## Expected Behavior (After Fix)

### AI Response 1 - Jack (Content Writer)
- Should respond naturally as the first team member
- No references to other responses (since he's first)
- Content-focused perspective

### AI Response 2 - Ivy (Marketing Specialist) 
- Should see Jack's response in context
- Should reference Jack's input: "I agree with Jack..." or "Building on what Jack mentioned..."
- Should add marketing perspective

### AI Response 3 - Grace (Product Designer)
- Should see both Jack's and Ivy's responses
- Should reference previous responses: "As Jack and Ivy mentioned..." 
- Should add design perspective

## Debug Information to Watch

### Frontend Console Logs
```
[Jack] Starting stream with history: (shows 1 user message)
[Jack] Added response to chat history for next AI. New history length: 2

[Ivy] Starting stream with history: (shows 1 user + 1 Jack response)
[Ivy] Added response to chat history for next AI. New history length: 3

[Grace] Starting stream with history: (shows 1 user + 1 Jack + 1 Ivy response)
```

### Backend Console Logs
```
[Content Writer] Received 2 messages in context:
  1. user: hey hey, let's talk about content calendar
  
[Marketing Specialist] Received 3 messages in context:
  1. user: hey hey, let's talk about content calendar
  2. assistant: [Jack's response]

[Product Designer] Received 4 messages in context:
  1. user: hey hey, let's talk about content calendar
  2. assistant: [Jack's response]  
  3. assistant: [Ivy's response]
```

## Success Criteria

✅ **Sequential Timing**: AIs respond one after another with visible delays
✅ **Context Awareness**: Later AIs reference earlier responses
✅ **Unique Perspectives**: Each AI adds their role-specific value
✅ **Natural Language**: AIs use collaborative language like "I agree with..." 

## Previous Issue (Before Fix)
- All AIs gave nearly identical responses
- No awareness of previous team member contributions
- Felt like 3 separate conversations instead of 1 team discussion

## Test Results

**Before Fix Response Pattern:**
```
Jack: "Hey there! Absolutely, let's dive into content calendars..."
Ivy:  "Hey there! Absolutely, let's dive into content calendars..." [IDENTICAL]
Grace: "Hey there! Absolutely, let's dive into content calendars..." [IDENTICAL]
```

**After Fix Expected Pattern:**
```
Jack: "Absolutely! Content calendars are essential for consistency..."
Ivy:  "Building on Jack's point, from a marketing perspective we should also consider..."  
Grace: "I agree with both Jack and Ivy. From a design standpoint, we need to think about..."
``` 