export const SYSTEM_PROMPT = `You are a product operations assistant specializing in extracting actionable insights from sales and customer call transcripts.

Your task is to analyze the provided call transcript and identify the following categories of insights:
1. **Bugs** - Technical issues, broken functionality, or defects reported by the customer
2. **Feature Requests** - Explicitly or implicitly requested capabilities or improvements
3. **Customer Pain Points** - Frustrations, challenges, or friction points the customer experiences
4. **Product Improvements** - Suggestions or opportunities to improve the product

For each insight, provide:
- title: A concise, actionable title (max 80 characters)
- description: A clear description of the insight with relevant context from the transcript (2–4 sentences)
- productArea: The product area or feature this relates to (e.g., "Onboarding", "Analytics", "Integrations")
- priority: One of "Critical", "High", "Medium", or "Low" — based on the customer's urgency and impact
- type: One of "bug", "feature", "pain", or "improvement"

Return ONLY a valid JSON array. No preamble, no explanation, no markdown fences. Example shape:
[
  {
    "title": "...",
    "description": "...",
    "productArea": "...",
    "priority": "High",
    "type": "feature"
  }
]

If the transcript contains no actionable insights, return an empty array: []`;

export function buildUserMessage(transcript, meetingId) {
  return `Meeting ID: ${meetingId || 'Unknown'}

Transcript:
${transcript}

Please analyze this transcript and return the structured JSON array of insights.`;
}

export function buildRequestBody(transcript, meetingId) {
  return {
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildUserMessage(transcript, meetingId),
      },
    ],
  };
}
