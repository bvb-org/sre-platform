import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/incidents/[id]/postmortem/check - AI proofreading and quality check
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, postmortem, question } = body;

    if (action === 'check') {
      // AI proofreading and quality check
      const prompt = buildQualityCheckPrompt(postmortem);

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const feedback = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return NextResponse.json({ feedback });
    } else if (action === 'ask') {
      // AI coaching - answer questions about postmortem methodology
      const prompt = buildCoachingPrompt(question, postmortem);

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const answer = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return NextResponse.json({ answer });
    } else if (action === 'expand') {
      // AI section expansion
      const { section, currentContent } = body;
      const prompt = buildExpansionPrompt(section, currentContent, postmortem);

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const expandedContent = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      return NextResponse.json({ expandedContent });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in AI check:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

function buildQualityCheckPrompt(postmortem: any): string {
  return `You are an expert SRE reviewing a postmortem document. Analyze the following postmortem for completeness, clarity, and quality. Provide specific, actionable feedback.

**Postmortem Content:**

**Introduction:**
${postmortem.introduction || '(Empty)'}

**Timeline Summary:**
${postmortem.timelineSummary || '(Empty)'}

**Root Cause:**
${postmortem.rootCause || '(Empty)'}

**Impact Analysis:**
${postmortem.impactAnalysis || '(Empty)'}

**How We Fixed It:**
${postmortem.howWeFixedIt || '(Empty)'}

**Action Items:**
${JSON.stringify(postmortem.actionItems || [], null, 2)}

**Lessons Learned:**
${postmortem.lessonsLearned || '(Empty)'}

---

Please provide a structured quality assessment with the following format:

**Overall Quality Score:** [Rate 1-10]

**Strengths:**
- [List what's done well]

**Issues Found:**
- [List specific problems with severity: ✅ Good, ⚠️ Needs Improvement, ❌ Critical Issue]

**Specific Recommendations:**
- [Provide actionable suggestions for improvement]

Focus on:
1. Completeness (are all sections filled with sufficient detail?)
2. Clarity (is the writing clear and understandable?)
3. Technical accuracy (does the root cause analysis make sense?)
4. Actionability (are action items specific and measurable?)
5. Learning value (does it provide insights for future prevention?)

Be constructive and specific. Flag sections with only 1-2 sentences as insufficient.`;
}

function buildCoachingPrompt(question: string, postmortem: any): string {
  return `You are an expert SRE coach helping someone write a better postmortem. Answer their question with practical, actionable guidance.

**User's Question:**
${question}

**Current Postmortem Context:**
- Introduction: ${postmortem.introduction ? 'Written' : 'Empty'}
- Root Cause: ${postmortem.rootCause ? 'Written' : 'Empty'}
- Impact: ${postmortem.impactAnalysis ? 'Written' : 'Empty'}
- Action Items: ${postmortem.actionItems?.length || 0} items

Provide a helpful, concise answer (2-4 paragraphs) that:
1. Directly addresses their question
2. Provides practical examples if relevant
3. References best practices in incident management
4. Suggests how to apply this to their current postmortem

Be encouraging and educational. If they ask about specific methodologies (like Swiss Cheese Model, Five Whys, etc.), explain them clearly with examples.`;
}

function buildExpansionPrompt(section: string, currentContent: string, postmortem: any): string {
  const sectionNames: Record<string, string> = {
    introduction: 'Introduction',
    timelineSummary: 'Timeline Summary',
    rootCause: 'Root Cause',
    impactAnalysis: 'Impact Analysis',
    howWeFixedIt: 'How We Fixed It',
    lessonsLearned: 'Lessons Learned',
  };

  return `You are an expert SRE helping expand a postmortem section. The user wants to expand the "${sectionNames[section]}" section.

**Current Content:**
${currentContent || '(Empty)'}

**Full Postmortem Context:**
- Incident: ${postmortem.incidentId || 'Unknown'}
- Other sections available for context

Please expand this section with:
1. More technical detail and specificity
2. Relevant metrics or data points (if applicable)
3. Clear, professional language
4. 2-3 paragraphs of comprehensive content

Maintain the same tone and style as the original. Add substance without being verbose. Focus on providing value to future readers who want to learn from this incident.

Return only the expanded content, without any preamble or explanation.`;
}
