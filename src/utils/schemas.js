import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────

const clamp = (min, max, fallback) =>
  z.number().min(min).max(max).catch(fallback);

const strOr = (fallback = '') => z.string().catch(fallback);
const arrOr = (schema)        => z.array(schema).catch([]);

// ── Insights ─────────────────────────────────────────────────────

export const InsightSchema = z.object({
  title:       strOr('Untitled Insight'),
  description: strOr(''),
  productArea: strOr(''),
  priority:    z.enum(['Critical','High','Medium','Low']).catch('Medium'),
  type:        z.enum(['bug','feature','pain','improvement','action']).catch('improvement'),
}).passthrough();

export const InsightsSchema = arrOr(InsightSchema);

// ── Call Intelligence ─────────────────────────────────────────────

export const IntelligenceSchema = z.object({
  callType:    strOr('Discovery'),
  framework:   strOr(''),
  callSummary: strOr(''),
  effectiveness: clamp(1, 10, 5),
  questionsAnsweredPct: clamp(0, 100, 50),
  customerSentiment: z.object({
    label:    strOr('Neutral'),
    score:    clamp(1, 10, 5),
    positive: clamp(0, 100, 50),
    neutral:  clamp(0, 100, 30),
    negative: clamp(0, 100, 20),
  }).catch({ label: 'Neutral', score: 5, positive: 50, neutral: 30, negative: 20 }),
  frameworkCoverage: arrOr(z.object({
    dimension: strOr(''),
    covered:   z.boolean().catch(false),
  }).passthrough()),
  keyThemes:       arrOr(z.string()).transform(a => a.slice(0, 5)),
  sentimentDrivers: z.object({
    positive: arrOr(z.string()).transform(a => a.slice(0, 4)),
    negative: arrOr(z.string()).transform(a => a.slice(0, 4)),
  }).catch({ positive: [], negative: [] }),
  strengths:    arrOr(z.string()).transform(a => a.slice(0, 3)),
  improvements: arrOr(z.string()).transform(a => a.slice(0, 3)),
  nextSteps:    arrOr(z.string()).transform(a => a.slice(0, 4)),
}).passthrough();

// ── Competitors ───────────────────────────────────────────────────

const CompetitorSchema = z.object({
  name:      strOr('Unknown'),
  category:  strOr(''),
  sentiment: z.enum(['positive','negative','neutral']).catch('neutral'),
  mentions:  z.number().int().nonnegative().catch(1),
  context:   strOr(''),
  quotes:    arrOr(z.string()),
}).passthrough();

export const CompetitorsSchema = z.object({
  competitors: arrOr(CompetitorSchema),
  summary:     strOr(''),
}).passthrough();

// ── Objections ────────────────────────────────────────────────────

const ObjectionSchema = z.object({
  summary:     strOr(''),
  quote:       strOr(''),
  category:    strOr('general'),
  severity:    z.enum(['blocking','moderate','minor']).catch('minor'),
  handled:     z.boolean().catch(false),
  repResponse: strOr(''),
}).passthrough();

export const ObjectionsSchema = z.object({
  objections:   arrOr(ObjectionSchema),
  handledCount: z.number().nonnegative().catch(0),
  totalCount:   z.number().nonnegative().catch(0),
  topRisk:      z.string().nullable().catch(null),
}).passthrough();

// ── Meeting Minutes ───────────────────────────────────────────────

export const MOMSchema = z.object({
  internal: strOr(''),
  external: strOr(''),
}).passthrough();

// ── Exec Summary ──────────────────────────────────────────────────

const ScoreEntrySchema = z.object({
  score:     clamp(1, 5, 3),
  rationale: strOr(''),
}).passthrough();

export const ExecSummaryPart1Schema = z.object({
  storyline:  strOr(''),
  useCases:   strOr(''),
  features:   arrOr(z.object({
    name:            strOr(''),
    module:          strOr(''),
    quality:         z.enum(['strong','moderate','weak']).catch('moderate'),
    valueArticulated: z.boolean().catch(false),
    useCase:         strOr(''),
  }).passthrough()),
  differentiation: z.object({
    shown:         arrOr(z.object({ differentiator: strOr(''), positioning: strOr('') }).passthrough()),
    missedNow:     arrOr(z.string()),
    saveLater:     arrOr(z.string()),
    whyWhatfix:    strOr(''),
    vsOthers:      strOr(''),
    overallRating: strOr(''),
  }).catch({ shown: [], missedNow: [], saveLater: [], whyWhatfix: '', vsOthers: '', overallRating: '' }),
}).passthrough();

export const ExecSummaryPart2Schema = z.object({
  infosec:      strOr(''),
  gaps:         strOr(''),
  improvements: strOr(''),
  questions:    arrOr(z.object({
    question: strOr(''),
    category: strOr('product-capability'),
    quality:  z.enum(['complete','partial','deflected','unanswered']).catch('partial'),
    urgency:  strOr('later'),
    response: strOr(''),
  }).passthrough()),
  scores: z.object({
    storytellingFlow:       ScoreEntrySchema.optional(),
    useCaseAlignment:       ScoreEntrySchema.optional(),
    featureValueMapping:    ScoreEntrySchema.optional(),
    differentiationClarity: ScoreEntrySchema.optional(),
    objectionHandling:      ScoreEntrySchema.optional(),
    overallEffectiveness:   ScoreEntrySchema.optional(),
  }).catch({}),
  executiveSummary: arrOr(z.string()),
  followUpActions:  arrOr(z.string()),
}).passthrough();

// ── Solution Framework ────────────────────────────────────────────

export const FrameworkRecommendationSchema = z.object({
  type:              z.enum(['MRP','DT','CD']).catch('DT'),
  confidence:        z.enum(['high','medium','low']).catch('low'),
  reason:            strOr(''),
  alternativeType:   z.string().nullable().catch(null),
  alternativeReason: z.string().nullable().catch(null),
}).passthrough();

export const FrameworkAnalysisSchema = z.object({
  overallFit:           z.enum(['strong','moderate','weak']).catch('moderate'),
  fitReason:            strOr(''),
  qualificationSignals: arrOr(z.object({ signal: strOr(''), present: z.boolean().catch(false) }).passthrough()),
  discoveryGaps:        arrOr(z.string()),
  requirementMapping:   arrOr(z.object({}).passthrough()),
  competitiveContext:   strOr(''),
  objections:           arrOr(z.object({}).passthrough()),
  roiAngles:            arrOr(z.string()),
  demoFocus:            strOr(''),
}).passthrough();
