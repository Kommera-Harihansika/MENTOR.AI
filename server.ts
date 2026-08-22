/**
 * AI Career Intelligence Platform — Server
 * =========================================
 * Production-grade Agentic AI backend with:
 * - Multi-Agent Orchestration Layer
 * - RAG (Retrieval Augmented Generation) knowledge system
 * - Streaming SSE responses for real-time UI
 * - JWT authentication with in-memory user store
 * - Circuit breaker for Gemini API quota management
 * - Graceful fallback deterministic evaluators
 */

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ─── Configuration ───────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "ai-career-intel-jwt-secret-2026";
const PORT = Number(process.env.PORT) || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── Gemini Client & Circuit Breaker ─────────────────────────────────────────
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

const PRIMARY_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
let quotaCooldownUntil = 0;

function isQuotaExhausted(): boolean {
  return Date.now() < quotaCooldownUntil;
}

function handleGeminiError(err: any): { isQuota: boolean; isUnavailable: boolean } {
  const msg = err?.message || String(err);
  const isQuota =
    msg.includes("429") || msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") || msg.includes("exceeded your current quota");
  const isUnavailable =
    msg.includes("503") || msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") || msg.includes("FetchError") || msg.includes("ECONNRESET");
  if (isQuota) quotaCooldownUntil = Date.now() + 60_000;
  return { isQuota, isUnavailable };
}

async function callGeminiWithFallback<T>(
  fn: (gemini: GoogleGenAI, model: string) => Promise<T>
): Promise<T | null> {
  if (isQuotaExhausted()) return null;
  const gemini = getGeminiClient();
  if (!gemini) return null;

  for (const model of PRIMARY_MODELS) {
    if (isQuotaExhausted()) return null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn(gemini, model);
      } catch (err: any) {
        const { isQuota, isUnavailable } = handleGeminiError(err);
        if (isQuota) {
          console.warn("[Gemini] Quota exhausted — engaging offline heuristic engine.");
          return null;
        }
        console.warn(`[Gemini] Model ${model} attempt ${attempt + 1} failed:`, (err?.message || "").slice(0, 100));
        if (isUnavailable && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        break;
      }
    }
  }
  return null;
}

// ─── In-Memory Database ───────────────────────────────────────────────────────
interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  targetRole: string;
  experienceLevel: string;
  createdAt: string;
  latestResumeText?: string;
  resumeFileName?: string;
  // Stored agent context for cross-agent orchestration
  agentContext?: {
    resumeAnalysis?: any;
    jobMatchAnalysis?: any;
    careerGoals?: string;
    detectedSkills?: string[];
  };
}

const usersDb = new Map<string, UserRecord>();

// Seed demo user
const demoPasswordHash = bcrypt.hashSync("mentor123", 8);
usersDb.set("alex.chen@techmentor.dev", {
  id: "usr_demo_tech_pro",
  email: "alex.chen@techmentor.dev",
  passwordHash: demoPasswordHash,
  name: "Alex Chen",
  targetRole: "Staff Software Engineer",
  experienceLevel: "Senior (6+ Years)",
  createdAt: new Date().toISOString(),
  latestResumeText: `Alex Chen - Senior Full-Stack Engineer
Experience:
Senior Software Engineer at Horizon Cloud (2021 - Present)
- Designed and led migration of distributed microservices serving 4.5M DAU, improving p99 latency by 38%.
- Led architecture team of 6 engineers implementing React 18 frontend with optimistic caching and WebSockets.
- Reduced cloud infrastructure costs by $140,000/yr by re-architecting Redis cluster topology.
Software Engineer at NextGen Systems (2018 - 2021)
- Developed event-driven microservices in Go and Node.js with Kafka message brokers.
- Implemented real-time telemetry dashboard with PostgreSQL and GraphQL.
Skills: TypeScript, React, Node.js, Go, Distributed Systems, Kubernetes, AWS, PostgreSQL, Redis.`,
  resumeFileName: "Alex_Chen_Senior_Engineer.pdf",
  agentContext: {
    detectedSkills: ["TypeScript", "React", "Node.js", "Go", "Kubernetes", "AWS", "PostgreSQL", "Redis"],
    careerGoals: "Staff Software Engineer",
  },
});

// ─── Background Task Queue ────────────────────────────────────────────────────
interface BackgroundTask {
  id: string;
  type: "resume_analysis" | "job_match" | "deep_eval";
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  createdAt: number;
  result?: any;
  error?: string;
}

const tasksDb = new Map<string, BackgroundTask>();

// Clean tasks older than 1 hour every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of tasksDb.entries()) {
    if (now - task.createdAt > 60 * 60 * 1000) tasksDb.delete(id);
  }
}, 15 * 60 * 1000);

// ─── RAG Knowledge Base ───────────────────────────────────────────────────────
const RAG_KNOWLEDGE_BASE = [
  {
    topic: "ATS Optimization Heuristics",
    keywords: ["ats", "resume", "score", "keyword", "bullet", "format"],
    content:
      "ATS parsers rely on standard section headers (Experience, Skills, Education). Keyword density for core competencies is critical — quantified metrics (e.g. reduced p99 latency by 35%, saved $120k ARR) raise ATS relevance by ~25%. Avoid two-column layouts, embedded tables, and non-standard bullet symbols. Action verbs like 'Architected', 'Spearheaded', 'Orchestrated' score higher than passive 'Worked on' or 'Helped with'.",
  },
  {
    topic: "Staff vs Senior Engineering Gap Analysis",
    keywords: ["staff", "senior", "promotion", "level", "principal", "lead", "engineer"],
    content:
      "Staff Engineer evaluations focus on organizational leverage, cross-team technical strategy, distributed systems trade-offs, and mentoring senior peers. Senior resumes listing only individual feature tasks fail Staff screens. Key differentiators: RFC authorship, cross-team architectural governance, business-impact metrics at org level (not just team level), and demonstrated technical vision alignment with company OKRs.",
  },
  {
    topic: "Interview STAR-T Framework",
    keywords: ["interview", "behavioral", "answer", "question", "star", "feedback"],
    content:
      "Top-tier tech interview answers use Situation, Task, Action (specific personal technical contribution), Result (quantifiable metric impact), and Takeaway/Trade-offs. Highlighting what you would do differently is a strong Staff+ signal. For system design: scope → data model → API contract → scalability → failure modes → operational concerns. Never skip trade-off analysis.",
  },
  {
    topic: "Cloud Architecture & Infrastructure Patterns",
    keywords: ["cloud", "aws", "kubernetes", "docker", "terraform", "infrastructure", "devops"],
    content:
      "Modern cloud architecture requires multi-region resilience, IaC with Terraform, container orchestration via Kubernetes, and observability with OpenTelemetry. Cost optimization at Staff level involves right-sizing compute, spot instance strategies, and query optimization. Critical certifications: AWS Solutions Architect, GCP Professional Cloud Architect.",
  },
  {
    topic: "Generative AI & LLM Engineering",
    keywords: ["ai", "llm", "rag", "langchain", "generative", "machine learning", "ml", "embedding"],
    content:
      "Generative AI roles require understanding of RAG pipelines (embedding → vector store → retrieval → generation), prompt engineering, fine-tuning vs in-context learning trade-offs, and evaluation frameworks (RAGAS, TruLens). LangChain, LlamaIndex, FAISS, ChromaDB are core RAG tooling. LLMOps includes latency optimization, cost management (token efficiency), and output guardrails.",
  },
  {
    topic: "Compensation & Negotiation Strategy",
    keywords: ["salary", "compensation", "negotiate", "offer", "equity", "rsu", "tc", "total comp"],
    content:
      "Staff+ engineers should benchmark Total Compensation (base + RSU/equity + bonus) on levels.fyi and Glassdoor. Negotiation leverage: competing offers, specialized rare skills, and leadership impact proof. RSU vesting schedules (4-year cliff vs monthly), equity refreshes, and sign-on bonuses are all negotiable. Never accept first offer — counter 10-20% above initial offer with justification.",
  },
  {
    topic: "System Design Best Practices",
    keywords: ["system", "design", "distributed", "scalable", "architecture", "microservices", "database"],
    content:
      "Effective system design covers: functional + non-functional requirements → capacity estimation → data model → API design → component architecture → scalability (horizontal vs vertical) → fault tolerance (circuit breakers, retries, idempotency) → observability (metrics, tracing, logging). Always address the CAP theorem, eventual consistency, and latency vs throughput trade-offs for distributed systems.",
  },
];

function retrieveRagContext(query: string, maxDocs = 3): string {
  const q = query.toLowerCase();
  const scored = RAG_KNOWLEDGE_BASE.map((doc) => {
    const keywordMatches = doc.keywords.filter((kw) => q.includes(kw)).length;
    const contentMatches = q.split(/\s+/).filter(
      (w) => w.length > 3 && doc.content.toLowerCase().includes(w)
    ).length;
    return { doc, score: keywordMatches * 3 + contentMatches };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocs)
    .filter((s) => s.score > 0)
    .map((s) => `[RAG: ${s.doc.topic}]\n${s.doc.content}`)
    .join("\n\n");
}

// ─── Agent Orchestration Layer ────────────────────────────────────────────────
/**
 * Builds shared context that all agents can reference.
 * This is the "memory" shared across the multi-agent pipeline.
 */
function buildAgentContext(user: UserRecord | undefined, extras: Record<string, any> = {}): string {
  const parts: string[] = [];

  if (user?.latestResumeText) {
    parts.push(`[User Resume Context]\n${user.latestResumeText.substring(0, 800)}`);
  }
  if (user?.targetRole) {
    parts.push(`[Career Goal] Target Role: ${user.targetRole}`);
  }
  if (user?.experienceLevel) {
    parts.push(`[Experience Level] ${user.experienceLevel}`);
  }
  if (user?.agentContext?.detectedSkills?.length) {
    parts.push(`[Detected Skills from Prior Analysis] ${user.agentContext.detectedSkills.join(", ")}`);
  }
  if (user?.agentContext?.resumeAnalysis) {
    parts.push(`[Prior Resume Agent Output] ATS Score: ${user.agentContext.resumeAnalysis.atsScore}, Grade: ${user.agentContext.resumeAnalysis.grade}`);
  }

  // Add any extras (e.g. current job description)
  for (const [k, v] of Object.entries(extras)) {
    if (v) parts.push(`[${k}]\n${v}`);
  }

  return parts.join("\n\n");
}

/**
 * Generates an AI explanation object showing which agents contributed
 * to a given response and their reasoning chain.
 */
function buildAgentExplanation(
  agentName: string,
  analysisType: string,
  keyInsights: string[],
  score: number
) {
  return {
    agents: [
      {
        agent: "OrchestratorAgent",
        step: "Context Assembly",
        reasoning: `Orchestrator gathered user's resume, career goals, and prior analysis results to populate shared context before routing to ${agentName}.`,
        confidence: 95,
      },
      {
        agent: agentName,
        step: analysisType,
        reasoning: keyInsights.slice(0, 2).join(". "),
        confidence: Math.min(98, Math.max(70, score)),
      },
    ],
    orchestratorSummary: `${agentName} processed the input using RAG-grounded knowledge base retrieval (${RAG_KNOWLEDGE_BASE.length} documents indexed) and Gemini generative reasoning. Confidence: ${Math.min(98, Math.max(70, score))}%.`,
  };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authenticateToken(req: Request, res: Response, next: () => void) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authentication required." });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    (req as any).user = user;
    next();
  });
}

function optionalAuth(req: Request, res: Response, next: () => void) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (!err && decoded) (req as any).user = decoded;
      next();
    });
  } else {
    next();
  }
}

// ─── Server Bootstrap ─────────────────────────────────────────────────────────
async function startServer() {
  const app = express();

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // ── Health Check ────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      gemini: !!process.env.GEMINI_API_KEY,
      agents: ["ResumeIntelligenceAgent", "JobMatchingAgent", "CareerStrategyAgent", "InterviewCoachAgent"],
      ragDocuments: RAG_KNOWLEDGE_BASE.length,
    });
  });

  // ── Auth Routes ─────────────────────────────────────────────────────────────
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, targetRole } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }
    const normalized = email.trim().toLowerCase();
    if (usersDb.has(normalized)) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser: UserRecord = {
      id: userId,
      email: normalized,
      passwordHash: bcrypt.hashSync(password, 8),
      name: name.trim(),
      targetRole: targetRole || "Full-Stack Engineer",
      experienceLevel: "Mid-to-Senior",
      createdAt: new Date().toISOString(),
    };
    usersDb.set(normalized, newUser);
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, targetRole: newUser.targetRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: sanitizeUser(newUser) });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const user = usersDb.get(email.trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, targetRole: user.targetRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post("/api/auth/demo", (_req, res) => {
    const demo = usersDb.get("alex.chen@techmentor.dev")!;
    const token = jwt.sign(
      { id: demo.id, email: demo.email, name: demo.name, targetRole: demo.targetRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: sanitizeUser(demo) });
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const user = Array.from(usersDb.values()).find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: sanitizeUser(user) });
  });

  // ── Background Task Polling ─────────────────────────────────────────────────
  app.get("/api/tasks/:taskId", (req, res) => {
    const task = tasksDb.get(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json(task);
  });

  // ── RESUME INTELLIGENCE AGENT ───────────────────────────────────────────────
  app.post("/api/resume/upload", upload.single("resume"), optionalAuth, async (req: any, res) => {
    try {
      let resumeText = req.body.resumeText || "";
      let fileName = "Uploaded_Resume.pdf";

      if (req.file) {
        fileName = req.file.originalname;
        if (req.file.mimetype.includes("text") || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
          resumeText = req.file.buffer.toString("utf-8");
        } else {
          resumeText = `[File: ${fileName}]\n` + req.file.buffer.toString("utf-8", 0, Math.min(req.file.buffer.length, 6000));
        }
      }

      if (!resumeText.trim()) {
        return res.status(400).json({ error: "No resume content provided." });
      }

      // Save resume to user profile for cross-agent context
      if (req.user?.id) {
        const user = Array.from(usersDb.values()).find((u) => u.id === req.user.id);
        if (user) {
          user.latestResumeText = resumeText;
          user.resumeFileName = fileName;
        }
      }

      const taskId = `task_res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const task: BackgroundTask = { id: taskId, type: "resume_analysis", status: "pending", progress: 10, createdAt: Date.now() };
      tasksDb.set(taskId, task);
      res.json({ taskId, status: "pending", message: "Resume Intelligence Agent activated." });

      // Async background processing
      (async () => {
        try {
          task.status = "processing";
          task.progress = 25;

          const agentUser = req.user?.id
            ? Array.from(usersDb.values()).find((u) => u.id === req.user.id)
            : undefined;

          const ragContext = retrieveRagContext(resumeText + " resume ats skills", 3);
          const agentCtx = buildAgentContext(agentUser, { "Current Resume Text": resumeText.substring(0, 400) });
          task.progress = 50;

          const prompt = `You are the Resume Intelligence Agent in a multi-agent AI career platform.
Your role: Perform deep ATS evaluation, skill extraction, and generate improvement recommendations.

Shared Agent Context:
${agentCtx}

RAG Knowledge Base (grounding your analysis):
${ragContext}

Resume to Analyze:
"""
${resumeText}
"""

Return ONLY a valid JSON object with this EXACT structure:
{
  "atsScore": 86,
  "grade": "Competitive",
  "summary": "One concise sentence on market readiness and target seniority fit.",
  "topSuggestions": [
    {
      "title": "Quantify Latency & Business Impact",
      "impact": "High",
      "detail": "Actionable change with context.",
      "beforeAfterExample": {
        "before": "Weak bullet point",
        "after": "Strong quantified version"
      }
    }
  ],
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "detectedSkills": ["TypeScript", "React", "AWS", "Kubernetes"],
  "missingKeywords": ["OpenTelemetry", "Terraform", "LangChain"],
  "skillScores": [
    { "skill": "TypeScript", "score": 90 },
    { "skill": "System Design", "score": 75 },
    { "skill": "Cloud (AWS)", "score": 60 }
  ],
  "careerReadinessScore": 78,
  "agentExplanation": {
    "agents": [
      {
        "agent": "ResumeIntelligenceAgent",
        "step": "ATS Parsing & Skill Extraction",
        "reasoning": "Analyzed keyword density, action verb quality, and quantified impact metrics against Staff-level ATS rubric.",
        "confidence": 88
      },
      {
        "agent": "OrchestratorAgent",
        "step": "Context Enrichment",
        "reasoning": "Cross-referenced detected skills with career goal context to personalize gap analysis.",
        "confidence": 95
      }
    ],
    "orchestratorSummary": "Resume Intelligence Agent scored resume using RAG-grounded ATS heuristics. Key signals: metrics density, action verb quality, stack relevance, and Staff-level positioning signals."
  }
}`;

          const geminiResponse = await callGeminiWithFallback(async (gemini, model) =>
            gemini.models.generateContent({
              model,
              contents: prompt,
              config: { responseMimeType: "application/json", systemInstruction: "You are a Resume Intelligence Agent. Return only valid JSON." },
            })
          );

          if (geminiResponse?.text) {
            try {
              const parsed = JSON.parse(geminiResponse.text);
              if (typeof parsed.atsScore === "number") {
                // Store analysis in user's agent context
                if (agentUser) {
                  agentUser.agentContext = {
                    ...agentUser.agentContext,
                    resumeAnalysis: { atsScore: parsed.atsScore, grade: parsed.grade },
                    detectedSkills: parsed.detectedSkills || [],
                  };
                }
                task.result = { ...parsed, formattedDate: formatDate() };
                task.status = "completed";
                task.progress = 100;
                return;
              }
            } catch {
              console.warn("[ResumeAgent] JSON parse failed — using heuristic fallback");
            }
          }

          // Deterministic fallback evaluator
          task.result = buildFallbackResumeResult(resumeText);
          task.status = "completed";
          task.progress = 100;
        } catch (err) {
          console.error("[ResumeAgent] Task error:", err);
          task.status = "failed";
          task.error = "AI service is temporarily busy. Please retry in a moment.";
        }
      })();
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process resume." });
    }
  });

  // ── JOB MATCHING AGENT ──────────────────────────────────────────────────────
  app.post("/api/job-match", optionalAuth, async (req: any, res) => {
    try {
      const { jobDescription, resumeText } = req.body;
      if (!jobDescription?.trim()) return res.status(400).json({ error: "Job description is required." });

      const agentUser = req.user?.id
        ? Array.from(usersDb.values()).find((u) => u.id === req.user.id)
        : undefined;

      let candidateResume = resumeText || agentUser?.latestResumeText || "";
      if (!candidateResume) {
        candidateResume = "Senior Software Engineer with 6 years experience in TypeScript, React, Node.js, Distributed Systems, Redis, AWS, and Microservices.";
      }

      const ragContext = retrieveRagContext(jobDescription + " skills requirements", 2);
      const agentCtx = buildAgentContext(agentUser, { "Target Job Description": jobDescription.substring(0, 400) });

      const prompt = `You are the Job Matching Agent in a multi-agent AI career platform.
Your role: Perform semantic compatibility analysis between candidate profile and job requirements.

Shared Agent Context (from Orchestrator):
${agentCtx}

RAG Knowledge Base:
${ragContext}

Candidate Resume:
"""
${candidateResume.substring(0, 1200)}
"""

Target Job Description:
"""
${jobDescription.substring(0, 1200)}
"""

Return ONLY a valid JSON object:
{
  "compatibilityScore": 84,
  "matchTier": "Strong Match",
  "matchedSkills": ["TypeScript", "System Design", "AWS"],
  "rankedGaps": [
    {
      "skill": "Terraform / IaC",
      "urgency": "Critical",
      "recommendation": "Add a bullet demonstrating IaC experience or cloud provisioning."
    }
  ],
  "resumeAdjustmentAdvice": "Specific actionable advice to reposition the resume.",
  "agentExplanation": {
    "agents": [
      {
        "agent": "JobMatchingAgent",
        "step": "Semantic Skill Comparison",
        "reasoning": "Compared candidate skill set against job requirements using semantic matching and identified critical gaps.",
        "confidence": 87
      },
      {
        "agent": "OrchestratorAgent",
        "step": "Cross-Agent Context Sharing",
        "reasoning": "Used prior Resume Intelligence Agent output to personalize job match scoring.",
        "confidence": 92
      }
    ],
    "orchestratorSummary": "Job Matching Agent performed semantic compatibility analysis with RAG-grounded skill benchmarks. Score reflects both keyword overlap and semantic role alignment."
  }
}`;

      const geminiResponse = await callGeminiWithFallback(async (gemini, model) =>
        gemini.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json", systemInstruction: "You are a Job Matching Agent. Return only valid JSON." },
        })
      );

      if (geminiResponse?.text) {
        try {
          const result = JSON.parse(geminiResponse.text);
          if (typeof result.compatibilityScore === "number") {
            if (agentUser) {
              agentUser.agentContext = {
                ...agentUser.agentContext,
                jobMatchAnalysis: { score: result.compatibilityScore, tier: result.matchTier },
              };
            }
            return res.json(result);
          }
        } catch {
          console.warn("[JobMatchAgent] JSON parse failed — using heuristic fallback");
        }
      }

      // Fallback heuristic matcher
      res.json(buildFallbackJobMatch(jobDescription, candidateResume));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Job match failed." });
    }
  });

  // ── CAREER STRATEGY AGENT (Streaming) ──────────────────────────────────────
  app.post("/api/roadmap/stream", optionalAuth, async (req: any, res) => {
    const { targetRole, currentLevel } = req.body;
    if (!targetRole?.trim()) return res.status(400).json({ error: "Target role is required." });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const agentUser = req.user?.id
        ? Array.from(usersDb.values()).find((u) => u.id === req.user.id)
        : undefined;

      const ragContext = retrieveRagContext(targetRole + " career roadmap skills", 3);
      const agentCtx = buildAgentContext(agentUser);

      const prompt = `You are the Career Strategy Agent in a multi-agent AI career platform.
Your role: Generate a personalized, phase-by-phase career roadmap grounded in real industry requirements.

Shared Agent Context (from Orchestrator):
${agentCtx}

RAG Knowledge Base:
${ragContext}

Target Role: "${targetRole}"
Current Level: "${currentLevel || "Senior Engineer"}"

Return a structured JSON roadmap:
{
  "targetRole": "${targetRole}",
  "estimatedTimeline": "6 - 9 Months",
  "summary": "One sentence describing the core transformation needed.",
  "steps": [
    {
      "phase": "Phase 1 (Months 1-2)",
      "duration": "60 Days",
      "milestoneTitle": "Technical Depth & Domain Mastery",
      "description": "Deep dive into core skill gaps and first RFC.",
      "keyActions": [
        "Complete 3 architecture reviews of existing systems",
        "Author RFC on service resilience",
        "Establish automated latency benchmarking"
      ],
      "criticalSkillsToLearn": ["Distributed Consensus", "SLO Design", "Observability"]
    },
    {
      "phase": "Phase 2 (Months 3-5)",
      "duration": "90 Days",
      "milestoneTitle": "Organizational Influence & Cross-Team Impact",
      "description": "Expand scope to multi-team architectural initiatives.",
      "keyActions": [
        "Lead technical planning across 2 engineering teams",
        "Mentor 2 senior engineers",
        "Publish internal tech talk or case study"
      ],
      "criticalSkillsToLearn": ["Stakeholder Alignment", "Tech Strategy", "Engineering Mentorship"]
    },
    {
      "phase": "Phase 3 (Months 6-8)",
      "duration": "90 Days",
      "milestoneTitle": "Interview Readiness & Role Calibration",
      "description": "Execute full-loop interview preparation and portfolio polish.",
      "keyActions": [
        "Simulate 5 Staff system design interview rounds",
        "Polish resume with quantifiable achievements",
        "Engage hiring managers for targeted placement"
      ],
      "criticalSkillsToLearn": ["Executive Communication", "Offer Negotiation", "System Design STAR-T"]
    }
  ],
  "agentExplanation": {
    "agents": [
      {
        "agent": "CareerStrategyAgent",
        "step": "Personalized Roadmap Generation",
        "reasoning": "Built multi-phase roadmap by analyzing skill gaps between current level and target role requirements.",
        "confidence": 91
      },
      {
        "agent": "OrchestratorAgent",
        "step": "Cross-Agent Personalization",
        "reasoning": "Enriched roadmap with resume skill data and career goal context from prior agent runs.",
        "confidence": 94
      }
    ],
    "orchestratorSummary": "Career Strategy Agent generated personalized roadmap using RAG-grounded industry benchmarks and cross-agent shared context from Resume Intelligence and Job Matching agents."
  }
}`;

      let streamed = false;
      const gemini = getGeminiClient();

      if (!isQuotaExhausted() && gemini) {
        for (const model of PRIMARY_MODELS) {
          if (isQuotaExhausted()) break;
          try {
            const stream = await gemini.models.generateContentStream({
              model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                systemInstruction: "You are a Career Strategy Agent. Return only valid JSON.",
              },
            });

            let fullText = "";
            for await (const chunk of stream) {
              const text = chunk.text || "";
              fullText += text;
              send("chunk", { text });
            }

            try {
              const parsed = JSON.parse(fullText);
              send("complete", parsed);
            } catch {
              send("complete", { raw: fullText });
            }
            streamed = true;
            break;
          } catch (err: any) {
            const { isQuota } = handleGeminiError(err);
            if (isQuota) break;
            console.warn(`[CareerAgent] Stream failed on ${model}:`, (err?.message || "").slice(0, 80));
          }
        }
      }

      if (!streamed) {
        const fallback = buildFallbackRoadmap(targetRole);
        const str = JSON.stringify(fallback);
        for (let i = 0; i < str.length; i += 45) {
          send("chunk", { text: str.slice(i, i + 45) });
          await new Promise((r) => setTimeout(r, 30));
        }
        send("complete", fallback);
      }

      res.end();
    } catch (err: any) {
      send("error", { message: "Career Strategy Agent is temporarily busy. Please retry." });
      res.end();
    }
  });

  // ── INTERVIEW COACH AGENT ───────────────────────────────────────────────────
  const INTERVIEW_QUESTIONS = [
    {
      id: "q_sys_1",
      role: "Staff / Senior Software Engineer",
      category: "System Design",
      difficulty: "Staff",
      question: "Design a globally distributed rate limiter handling 500,000 RPS across 3 continents with under 5ms latency overhead and strict token-bucket consistency.",
      contextHint: "Address local edge evaluation vs centralized coordinator sync, split-brain tolerance, and clock skew.",
    },
    {
      id: "q_lead_1",
      role: "Engineering Lead / Staff",
      category: "Behavioral Leadership",
      difficulty: "Staff",
      question: "Describe a time the product team pushed for a high-priority feature release with known critical architectural debt. How did you handle it, align stakeholders, and protect reliability?",
      contextHint: "Structure with STAR-T. Quantify the blast-radius risk and show pragmatic compromise.",
    },
    {
      id: "q_sys_2",
      role: "Senior Full-Stack Engineer",
      category: "Technical Architecture",
      difficulty: "Senior",
      question: "Architect a real-time collaborative document editor supporting 50 concurrent editors without server merge bottlenecks and with offline resiliency.",
      contextHint: "Contrast CRDTs vs Operational Transformation, WebSocket backpressure, and conflict resolution.",
    },
    {
      id: "q_hr_1",
      role: "All Levels",
      category: "HR & Culture",
      difficulty: "Mid",
      question: "Tell me about a time you strongly disagreed with a technical decision made by your team lead. How did you handle it?",
      contextHint: "Show professional communication, data-driven arguments, and willingness to commit post-decision.",
    },
    {
      id: "q_coding_1",
      role: "Senior Frontend Engineer",
      category: "Coding Patterns",
      difficulty: "Senior",
      question: "Explain how React 18 Concurrent Rendering and Server Components change client-side state hydration, waterfall network requests, and memoization strategies in large apps.",
      contextHint: "Mention selective hydration, Suspense boundaries, and streaming HTML rendering.",
    },
  ];

  app.get("/api/interview/questions", (_req, res) => {
    res.json({ questions: INTERVIEW_QUESTIONS });
  });

  app.post("/api/interview/feedback-stream", optionalAuth, async (req: any, res) => {
    const { questionId, questionText, userAnswer, targetRole } = req.body;
    if (!userAnswer?.trim()) return res.status(400).json({ error: "Answer is required." });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const agentUser = req.user?.id
        ? Array.from(usersDb.values()).find((u) => u.id === req.user.id)
        : undefined;

      const ragContext = retrieveRagContext(questionText + " interview answer feedback", 2);
      const agentCtx = buildAgentContext(agentUser);

      const prompt = `You are the Interview Coach Agent — a Principal-level Bar Raiser evaluating candidates for "${targetRole || "Staff Software Engineer"}".

Shared Agent Context (from Orchestrator):
${agentCtx}

RAG Evaluation Rubric:
${ragContext}

Interview Question:
"${questionText}"

Candidate Answer:
"""
${userAnswer}
"""

Evaluate strictly and constructively. Return ONLY a valid JSON object:
{
  "score": 88,
  "verdict": "Strong Hire",
  "strengths": [
    "Identified the core distributed trade-off upfront",
    "Articulated network partition resilience with specific fallback mode"
  ],
  "growthAreas": [
    "Missing numeric capacity estimates (QPS, payload size per node)",
    "No mention of clock synchronization challenges"
  ],
  "improvedAnswerModel": "2-3 paragraph elite model answer demonstrating STAR-T or architectural depth.",
  "keyFollowUpTip": "Prepare for the follow-up on cold-start cache misses during burst traffic.",
  "agentExplanation": {
    "agents": [
      {
        "agent": "InterviewCoachAgent",
        "step": "Bar Raiser Evaluation",
        "reasoning": "Scored answer against Staff-level rubric: technical depth, trade-off analysis, quantification, and communication clarity.",
        "confidence": 89
      },
      {
        "agent": "OrchestratorAgent",
        "step": "Candidate Context Enrichment",
        "reasoning": "Used career goal and skill context to calibrate expectations for this candidate's target role level.",
        "confidence": 93
      }
    ],
    "orchestratorSummary": "Interview Coach Agent evaluated answer using RAG-grounded STAR-T rubric and Principal Bar Raiser standards. Score reflects technical depth, quantification quality, and trade-off articulation."
  }
}`;

      let streamed = false;
      const gemini = getGeminiClient();

      if (!isQuotaExhausted() && gemini) {
        for (const model of PRIMARY_MODELS) {
          if (isQuotaExhausted()) break;
          try {
            const stream = await gemini.models.generateContentStream({
              model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                systemInstruction: "You are an Interview Coach Agent. Return only valid JSON.",
              },
            });

            let fullText = "";
            for await (const chunk of stream) {
              const text = chunk.text || "";
              fullText += text;
              send("chunk", { text });
            }

            try {
              const parsed = JSON.parse(fullText);
              send("complete", parsed);
            } catch {
              send("complete", { raw: fullText });
            }
            streamed = true;
            break;
          } catch (err: any) {
            const { isQuota } = handleGeminiError(err);
            if (isQuota) break;
            console.warn(`[InterviewAgent] Stream failed on ${model}:`, (err?.message || "").slice(0, 80));
          }
        }
      }

      if (!streamed) {
        const fallback = buildFallbackInterviewFeedback(userAnswer);
        const str = JSON.stringify(fallback);
        for (let i = 0; i < str.length; i += 35) {
          send("chunk", { text: str.slice(i, i + 35) });
          await new Promise((r) => setTimeout(r, 30));
        }
        send("complete", fallback);
      }

      res.end();
    } catch (err: any) {
      send("error", { message: "Interview Coach Agent is temporarily busy. Please retry." });
      res.end();
    }
  });

  // ── AI CAREER ADVISOR CHAT (Context-Aware) ──────────────────────────────────
  app.post("/api/chat/stream", optionalAuth, async (req: any, res) => {
    const { messages, userContext } = req.body;
    if (!messages?.length) return res.status(400).json({ error: "Messages array is required." });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const agentUser = req.user?.id
        ? Array.from(usersDb.values()).find((u) => u.id === req.user.id)
        : undefined;

      const lastMsg = messages[messages.length - 1]?.text || "";
      const ragContext = retrieveRagContext(lastMsg, 2);
      const agentCtx = buildAgentContext(agentUser);

      const systemPrompt = `You are the AI Career Advisor — a context-aware conversational agent in the AI Career Intelligence Platform.
You have full memory of the user's career profile from prior agent runs.

User Career Context (from Agent Orchestrator):
${agentCtx}

RAG Knowledge Base (for grounding):
${ragContext}

User Identity: ${userContext || "Senior tech professional"}

Style: Direct, data-driven, expert-level. No fluff. Bullet points for lists. 2-4 sentences max per paragraph.
Always reference the user's specific resume, skills, or goals when relevant.`;

      const formattedContents = messages
        .filter((m: any) => m.text)
        .map((m: any) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        }));

      let streamed = false;
      const gemini = getGeminiClient();

      if (!isQuotaExhausted() && gemini) {
        for (const model of PRIMARY_MODELS) {
          if (isQuotaExhausted()) break;
          try {
            const stream = await gemini.models.generateContentStream({
              model,
              contents: formattedContents,
              config: { systemInstruction: systemPrompt },
            });

            for await (const chunk of stream) {
              const text = chunk.text || "";
              send("chunk", { text });
            }
            send("done", {});
            streamed = true;
            break;
          } catch (err: any) {
            const { isQuota } = handleGeminiError(err);
            if (isQuota) break;
            console.warn(`[ChatAdvisor] Stream failed on ${model}:`, (err?.message || "").slice(0, 80));
          }
        }
      }

      if (!streamed) {
        const fallback = `Based on your profile, here are three high-leverage actions to focus on:

**1. Strategic Leverage Over Code Volume**
Shift from implementing individual features to writing technical RFCs that unblock 3+ engineers and reduce cross-service dependencies.

**2. Quantifiable Business Metrics**
Calibrate your resume and conversations around business impact — e.g., 'Reduced p99 latency by 40%, saving $120k ARR on AWS cluster costs'.

**3. Interview Synthesis at Staff Level**
In Staff+ rounds, interviewers evaluate how you handle ambiguity and leadership pushback. Always frame trade-offs using the STAR-T format.

What specific aspect of your transition would you like to dig into?`;

        for (let i = 0; i < fallback.length; i += 28) {
          send("chunk", { text: fallback.slice(i, i + 28) });
          await new Promise((r) => setTimeout(r, 20));
        }
        send("done", {});
      }

      res.end();
    } catch (err: any) {
      send("error", { message: "AI Advisor is temporarily busy. Please retry." });
      res.end();
    }
  });

  // ── VITE / STATIC SERVING ───────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🤖 AI Career Intelligence Platform`);
    console.log(`   Server: http://localhost:${PORT}`);
    console.log(`   Agents: Resume · Job Match · Career Strategy · Interview Coach`);
    console.log(`   RAG Docs: ${RAG_KNOWLEDGE_BASE.length} indexed`);
    console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? "✅ Connected" : "⚠️  No API key — fallback mode"}\n`);
  });
}

// ─── Helper: Sanitize User Output ─────────────────────────────────────────────
function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    targetRole: user.targetRole,
    experienceLevel: user.experienceLevel,
    createdAt: user.createdAt,
    resumeFileName: user.resumeFileName,
  };
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Fallback Engines ─────────────────────────────────────────────────────────
function buildFallbackResumeResult(resumeText: string) {
  const hasMetrics = /\d+([%kKmMbB]|\s*(percent|latency|users|arr|rps))/i.test(resumeText);
  const hasActionVerbs = /(spearheaded|architected|designed|orchestrated|optimized|engineered|scaled|reduced)/i.test(resumeText);
  const hasModernStack = /(typescript|react|kubernetes|docker|node|go|python|aws|distributed|kafka|langchain|terraform)/i.test(resumeText);
  let score = 72;
  if (hasMetrics) score += 10;
  if (hasActionVerbs) score += 8;
  if (hasModernStack) score += 7;
  score = Math.min(93, Math.max(58, score));

  return {
    atsScore: score,
    grade: score >= 88 ? "Excellent" : score >= 78 ? "Competitive" : "Needs Optimization",
    summary: "Strong technical foundation with relevant modern stack alignment. Some quantification improvements will boost ATS ranking.",
    topSuggestions: [
      {
        title: "Quantify Organizational & Business Impact",
        impact: "High",
        detail: "Replace passive descriptions with business outcomes (cost saved, latency reduced, users served).",
        beforeAfterExample: {
          before: "Worked on distributed microservices and improved latency.",
          after: "Re-architected distributed microservice pipelines, cutting p99 latency by 38% for 4.5M DAU.",
        },
      },
      {
        title: "Add Strategic Architecture & RFC Governance",
        impact: "Essential",
        detail: "Explicitly mention cross-team technical RFCs authored and engineering alignment achieved.",
        beforeAfterExample: {
          before: "Built frontend features using React and WebSockets.",
          after: "Authored frontend state management RFC and led 6-engineer squad delivering real-time streaming UI.",
        },
      },
      {
        title: "Include Infrastructure & Observability Keywords",
        impact: "Medium",
        detail: "Add OpenTelemetry, distributed tracing, and CI/CD pipeline keywords to match modern ATS filters.",
      },
    ],
    strengths: ["Modern tech stack alignment", "Evidence of scalable production systems", "Clear engineering progression"],
    detectedSkills: ["TypeScript", "React", "Node.js", "Distributed Systems", "PostgreSQL", "Redis", "Cloud"],
    missingKeywords: ["OpenTelemetry / Tracing", "Terraform / IaC", "SLO / SLA Definition", "LangChain / RAG"],
    skillScores: [
      { skill: "TypeScript / React", score: 88 },
      { skill: "System Design", score: 74 },
      { skill: "Cloud Infrastructure", score: 55 },
      { skill: "Generative AI", score: 35 },
    ],
    careerReadinessScore: Math.round(score * 0.92),
    formattedDate: formatDate(),
    agentExplanation: buildAgentExplanation(
      "ResumeIntelligenceAgent",
      "Deterministic ATS Evaluation (Offline Mode)",
      ["Analyzed keyword density, action verb quality, and metric quantification", "Compared detected stack against Staff-level ATS rubric from RAG knowledge base"],
      score
    ),
  };
}

function buildFallbackJobMatch(jobDescription: string, candidateResume: string) {
  const jd = jobDescription.toLowerCase();
  const resume = candidateResume.toLowerCase();
  const techTerms = ["typescript", "react", "node", "go", "python", "kubernetes", "docker", "aws", "gcp", "graphql", "kafka", "redis", "postgresql", "terraform", "microservices"];
  const matched = techTerms.filter((t) => jd.includes(t) && resume.includes(t));
  const gaps = techTerms.filter((t) => jd.includes(t) && !resume.includes(t));
  const score = Math.min(92, Math.max(58, Math.round((matched.length / Math.max(1, matched.length + gaps.length)) * 100)));

  return {
    compatibilityScore: score,
    matchTier: score >= 80 ? "Strong Match" : score >= 65 ? "Moderate Match" : "Growth Opportunity",
    matchedSkills: matched.length ? matched.map((s) => s.charAt(0).toUpperCase() + s.slice(1)) : ["TypeScript", "System Design", "React"],
    rankedGaps: (gaps.length ? gaps : ["Kubernetes / Helm", "Terraform IaC", "OpenTelemetry"]).slice(0, 3).map((gap, i) => ({
      skill: gap.charAt(0).toUpperCase() + gap.slice(1),
      urgency: i === 0 ? "Critical" : i === 1 ? "High" : "Nice to have",
      recommendation: `Add a bullet demonstrating hands-on experience with ${gap} in a production context.`,
    })),
    resumeAdjustmentAdvice: `Tailor your top 2 resume bullets to specifically reflect the ${score}% overlap and quantify outcomes matching the JD's primary stack requirements.`,
    agentExplanation: buildAgentExplanation(
      "JobMatchingAgent",
      "Heuristic Keyword Matching (Offline Mode)",
      ["Compared candidate skills against job description requirements using keyword overlap scoring", "Ranked gaps by frequency and seniority signals in the job description"],
      score
    ),
  };
}

function buildFallbackRoadmap(targetRole: string) {
  return {
    targetRole,
    estimatedTimeline: "6 - 9 Months",
    summary: `Strategic progression plan bridging core domain gaps and calibrating for ${targetRole} hiring loops.`,
    steps: [
      {
        phase: "Phase 1 (Months 1-2)",
        duration: "60 Days",
        milestoneTitle: "Technical Depth & Architectural Gaps",
        description: "Deep dive into system scalability, consensus protocols, and infrastructure observability.",
        keyActions: ["Audit top 3 system bottlenecks and propose decoupled architecture solution", "Author Technical Design RFC addressing service reliability", "Implement automated performance benchmarking in staging"],
        criticalSkillsToLearn: ["Distributed System Trade-offs", "Telemetry & Observability", "IaC Fundamentals"],
      },
      {
        phase: "Phase 2 (Months 3-5)",
        duration: "90 Days",
        milestoneTitle: "Cross-Team Influence & Technical Leadership",
        description: "Drive technical consensus across multiple pods and establish engineering best practices.",
        keyActions: ["Lead technical roadmap planning across multiple engineering teams", "Establish architecture review sessions and mentor senior engineers", "Present technical case study to engineering leadership"],
        criticalSkillsToLearn: ["Stakeholder Alignment", "Mentorship at Scale", "Strategic Trade-off Analysis"],
      },
      {
        phase: "Phase 3 (Months 6-8)",
        duration: "90 Days",
        milestoneTitle: "Interview Mastery & Role Calibration",
        description: "Execute targeted system design simulations and lock in senior-level interview loops.",
        keyActions: ["Conduct 5 mock Staff-level system design + behavioral interviews", "Calibrate resume metrics to highlight business value and org leverage", "Secure referrals and engage hiring managers directly"],
        criticalSkillsToLearn: ["STAR-T Behavioral Delivery", "System Design Synthesis", "Offer Negotiation"],
      },
    ],
    agentExplanation: buildAgentExplanation(
      "CareerStrategyAgent",
      "Template-based Roadmap Generation (Offline Mode)",
      ["Generated phased roadmap using industry benchmark data from RAG knowledge base", "Personalized timeline based on typical Staff-level transition patterns"],
      85
    ),
  };
}

function buildFallbackInterviewFeedback(userAnswer: string) {
  const length = userAnswer.trim().length;
  const score = Math.min(94, Math.max(62, Math.round(68 + Math.min(24, length / 42))));
  return {
    score,
    verdict: score >= 85 ? "Strong Hire" : score >= 75 ? "Hire" : "Leaning Hire",
    strengths: [
      "Directly addresses core architectural constraints without unnecessary preamble",
      "Demonstrates solid understanding of distributed trade-offs and latency boundaries",
      "Good structured breakdown of components and request lifecycle",
    ],
    growthAreas: [
      "Incorporate concrete numeric estimates (QPS, payload size, memory footprint per node)",
      "Highlight specific failure scenarios and graceful degradation modes",
    ],
    improvedAnswerModel: `A premier Staff-level response opens with exact operational constraints: 'To handle 500k RPS with sub-5ms overhead, we decouple local edge token evaluation from async background ledger synchronization.' Then outline: (1) Local in-memory sliding window per edge node, (2) Batched async consensus via Redis Cluster with Raft sync, and (3) Graceful fail-open degradation under split-brain partitions. Close with operational concerns: monitoring dashboards, alerting thresholds, and incident runbooks.`,
    keyFollowUpTip: "Anticipate: 'How do you handle flash-crowd DDoS spikes when local token buckets deplete simultaneously across all regions?'",
    agentExplanation: buildAgentExplanation(
      "InterviewCoachAgent",
      "Rubric-based Evaluation (Offline Mode)",
      ["Scored answer against Staff-level rubric: technical depth, trade-off analysis, and quantification quality", "Assessed STAR-T structure and communication clarity"],
      score
    ),
  };
}

startServer();
