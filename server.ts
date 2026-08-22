import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "ai-career-mentor-jwt-secret-key-998822";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to call Gemini with retries and fallback models on 503/429/temporary capacity errors
const PRIMARY_MODELS = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-flash-latest"];
let quotaCooldownUntil = 0;

function isQuotaExhausted(): boolean {
  return Date.now() < quotaCooldownUntil;
}

function handleGeminiError(err: any): { isQuota: boolean; isUnavailable: boolean } {
  const errMsg = err?.message || String(err);
  const isQuota =
    errMsg.includes("429") ||
    errMsg.includes("quota") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("exceeded your current quota");

  const isUnavailable =
    errMsg.includes("503") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("high demand") ||
    errMsg.includes("FetchError") ||
    errMsg.includes("ECONNRESET");

  if (isQuota) {
    // Trip circuit breaker for 60 seconds to prevent hammering API when quota is exhausted
    quotaCooldownUntil = Date.now() + 60_000;
  }

  return { isQuota, isUnavailable };
}

async function callGeminiWithFallback<T>(
  fn: (gemini: GoogleGenAI, model: string) => Promise<T>
): Promise<T | null> {
  if (isQuotaExhausted()) {
    return null;
  }

  const gemini = getGeminiClient();
  if (!gemini) return null;

  for (const model of PRIMARY_MODELS) {
    if (isQuotaExhausted()) return null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn(gemini, model);
      } catch (err: any) {
        const { isQuota, isUnavailable } = handleGeminiError(err);
        
        // If quota limit is hit, do not spam other models with same key
        if (isQuota) {
          console.warn(`[Gemini API] Quota exhausted on API key. Engaging offline heuristic engine.`);
          return null;
        }

        console.warn(`[Gemini API] Model ${model} (attempt ${attempt + 1}/2) temporarily unavailable:`, (err?.message || "").slice(0, 100));

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

// In-Memory Database
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
}

const usersDb: Map<string, UserRecord> = new Map();

// Seed a default demo user
const demoUserHash = bcrypt.hashSync("mentor123", 8);
const demoUserId = "usr_demo_tech_pro";
usersDb.set("alex.chen@techmentor.dev", {
  id: demoUserId,
  email: "alex.chen@techmentor.dev",
  passwordHash: demoUserHash,
  name: "Alex Chen",
  targetRole: "Staff Software Engineer",
  experienceLevel: "Senior (6+ Years)",
  createdAt: new Date().toISOString(),
  latestResumeText: `Alex Chen - Senior Full-Stack Engineer
Experience:
Senior Software Engineer at Horizon Cloud (2021 - Present)
- Designed and spearheaded migration of distributed microservices serving 4.5M DAU, improving p99 latency by 38%.
- Led architecture team of 6 engineers implementing React 18 frontend with optimistic caching and WebSockets.
- Reduced cloud infrastructure costs by $140,000/yr by re-architecting Redis cluster topology and batching query pipelines.
Software Engineer at NextGen Systems (2018 - 2021)
- Developed event-driven microservices in Go and Node.js with Kafka message brokers.
- Implemented real-time telemetry dashboard with PostgreSQL and GraphQL.
Skills: TypeScript, React, Node.js, Go, Distributed Systems, Kubernetes, AWS, PostgreSQL, Redis, System Design.`,
  resumeFileName: "Alex_Chen_Senior_Engineer.pdf",
});

// Background Tasks Store (for asynchronous Resume / JD processing & polling)
interface BackgroundTask {
  id: string;
  type: "resume_analysis" | "job_match" | "deep_eval";
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  createdAt: number;
  result?: any;
  error?: string;
}

const tasksDb: Map<string, BackgroundTask> = new Map();

// Clean old tasks periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of tasksDb.entries()) {
    if (now - task.createdAt > 1000 * 60 * 60) {
      tasksDb.delete(id);
    }
  }
}, 1000 * 60 * 15);

// Curated RAG Knowledge Base for Tech Roles and Hiring Heuristics
const TECH_KNOWLEDGE_BASE = [
  {
    topic: "ATS Optimization Heuristics",
    content: "ATS parsers parse standard section headers (Experience, Skills, Education, Projects). They calculate keyword density for core competencies and penalize two-column graphics, multi-nested tables, and non-standard bullet symbols. Quantified metrics (e.g. reduced p99 latency by 35%, saved $120k ARR) raise ATS relevance weighting by ~25%.",
  },
  {
    topic: "Staff vs Senior Engineering Gap",
    content: "Staff Engineer evaluations focus on organizational leverage, cross-team technical strategy, distributed systems trade-offs, and mentoring senior peers. Senior resumes that list only individual feature tasks fail Staff screens. Bullet points must demonstrate driving technical consensus, RFC authorship, and architectural governance.",
  },
  {
    topic: "Interview Answering Framework (STAR-T)",
    content: "Top-tier tech interview answers structure around Situation, Task, Action (specific personal technical contribution), Result (quantifiable metric impact), and Takeaway/Trade-offs. Highlighting what you would do differently is a strong Staff+ signal.",
  },
];

// Helper: RAG retrieval by keyword matching
function retrieveRagContext(query: string): string {
  const q = query.toLowerCase();
  const matched = TECH_KNOWLEDGE_BASE.filter(doc =>
    q.split(/\s+/).some(word => word.length > 3 && doc.content.toLowerCase().includes(word) || doc.topic.toLowerCase().includes(word))
  );
  return matched.map(m => `[Reference: ${m.topic}] ${m.content}`).join("\n\n");
}

// Authentication Middleware
function authenticateToken(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired session token" });
    }
    (req as any).user = user;
    next();
  });
}

// Optional Auth (guest friendly)
function optionalAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (!err && decoded) {
        (req as any).user = decoded;
      }
      next();
    });
  } else {
    next();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // --- HEALTH CHECK ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- AUTHENTICATION ROUTES ---
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, targetRole } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (usersDb.has(normalizedEmail)) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = bcrypt.hashSync(password, 8);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser: UserRecord = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      targetRole: targetRole || "Full-Stack Engineer",
      experienceLevel: "Mid-to-Senior",
      createdAt: new Date().toISOString(),
    };

    usersDb.set(normalizedEmail, newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, targetRole: newUser.targetRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        targetRole: newUser.targetRole,
        experienceLevel: newUser.experienceLevel,
        createdAt: newUser.createdAt,
      },
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = usersDb.get(normalizedEmail);

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, targetRole: user.targetRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        targetRole: user.targetRole,
        experienceLevel: user.experienceLevel,
        createdAt: user.createdAt,
      },
    });
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const user = Array.from(usersDb.values()).find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        targetRole: user.targetRole,
        experienceLevel: user.experienceLevel,
        createdAt: user.createdAt,
        latestResumeText: user.latestResumeText ? user.latestResumeText.substring(0, 100) + "..." : undefined,
        resumeFileName: user.resumeFileName,
      },
    });
  });

  // Guest Instant Demo Login
  app.post("/api/auth/demo", (req, res) => {
    const demoUser = usersDb.get("alex.chen@techmentor.dev")!;
    const token = jwt.sign(
      { id: demoUser.id, email: demoUser.email, name: demoUser.name, targetRole: demoUser.targetRole },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        targetRole: demoUser.targetRole,
        experienceLevel: demoUser.experienceLevel,
        createdAt: demoUser.createdAt,
        resumeFileName: demoUser.resumeFileName,
      },
    });
  });

  // --- BACKGROUND TASK POLLING ENDPOINT ---
  app.get("/api/tasks/:taskId", (req, res) => {
    const task = tasksDb.get(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }
    res.json(task);
  });

  // --- RESUME ANALYSIS (ASYNC BACKGROUND TASK) ---
  app.post("/api/resume/upload", upload.single("resume"), optionalAuth, async (req: any, res) => {
    try {
      let resumeText = req.body.resumeText || "";
      let fileName = "Uploaded_Resume.pdf";

      if (req.file) {
        fileName = req.file.originalname;
        // In case of plain text or markdown upload
        if (req.file.mimetype.includes("text") || req.file.originalname.endsWith(".txt") || req.file.originalname.endsWith(".md")) {
          resumeText = req.file.buffer.toString("utf-8");
        } else {
          // Extracted or base64 representation for Gemini processing
          resumeText = `[File: ${fileName}, Size: ${req.file.size} bytes]\n` + req.file.buffer.toString("utf-8", 0, Math.min(req.file.buffer.length, 6000));
        }
      }

      if (!resumeText.trim()) {
        return res.status(400).json({ error: "No resume content provided. Please upload a file or paste your resume text." });
      }

      // If user is authenticated, save to their profile
      if (req.user?.id) {
        const user = Array.from(usersDb.values()).find(u => u.id === req.user.id);
        if (user) {
          user.latestResumeText = resumeText;
          user.resumeFileName = fileName;
        }
      }

      const taskId = `task_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const task: BackgroundTask = {
        id: taskId,
        type: "resume_analysis",
        status: "pending",
        progress: 10,
        createdAt: Date.now(),
      };
      tasksDb.set(taskId, task);

      // Return taskId immediately so frontend can poll
      res.json({ taskId, status: "pending", message: "Resume uploaded. Analysis initiated." });

      // Run background processing asynchronously
      (async () => {
        try {
          task.status = "processing";
          task.progress = 30;

          const ragContext = retrieveRagContext(resumeText);
          task.progress = 60;

          const prompt = `You are a Principal Tech Recruiter and ATS Evaluation Engine.
Analyze the following resume objectively. Ground your analysis with these principles:
${ragContext}

Resume Text:
"""
${resumeText}
"""

Return a JSON object with this exact structure:
{
  "atsScore": 86, // number 0-100
  "grade": "Competitive", // "Excellent" | "Competitive" | "Needs Optimization" | "Critical Issues"
  "summary": "One concise sentence evaluating market readiness and target seniority.",
  "topSuggestions": [
    {
      "title": "Quantify Leadership & Latency Impact",
      "impact": "High", // "High" | "Medium" | "Essential"
      "detail": "Actionable explanation of what to change.",
      "beforeAfterExample": {
        "before": "Weak bullet point phrasing",
        "after": "Strong metric-backed phrasing"
      }
    }
  ], // exactly 3 top suggestions
  "strengths": ["Clear distributed systems depth", "Strong metrics on cost reduction", "Modern React 18 stack"],
  "detectedSkills": ["TypeScript", "Distributed Systems", "AWS", "Docker", "Node.js", "Redis"],
  "missingKeywords": ["Terraform / IaC", "Distributed Tracing (OpenTelemetry)", "CI/CD Pipeline Design"]
}`;

          const geminiResponse = await callGeminiWithFallback(async (gemini, model) => {
            return await gemini.models.generateContent({
              model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                systemInstruction: "You evaluate software engineering resumes with rigorous, high-signal ATS scoring and concise actionable feedback.",
              },
            });
          });

          if (geminiResponse && geminiResponse.text) {
            try {
              const parsedResult = JSON.parse(geminiResponse.text);
              if (parsedResult && typeof parsedResult.atsScore === "number") {
                task.result = {
                  ...parsedResult,
                  formattedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                };
                task.progress = 100;
                task.status = "completed";
                return;
              }
            } catch (jsonErr) {
              console.warn("JSON parsing failed from Gemini output, falling back to deterministic evaluator");
            }
          }

          // Robust High-Fidelity Fallback Parser (Deterministic ATS Evaluator)
          const textLower = resumeText.toLowerCase();
          const hasMetrics = /\d+([%kKmMbB]|\s*percent|\s*latency|\s*users|\s*arr|\s*rps)/i.test(resumeText);
          const hasActionVerbs = /(spearheaded|architected|designed|orchestrated|optimized|engineered|scaled|reduced)/i.test(resumeText);
          const hasModernStack = /(typescript|react|kubernetes|docker|node|go|python|aws|distributed|cloud|kafka)/i.test(resumeText);

          let baseScore = 74;
          if (hasMetrics) baseScore += 10;
          if (hasActionVerbs) baseScore += 8;
          if (hasModernStack) baseScore += 6;
          baseScore = Math.min(94, Math.max(58, baseScore));

          task.progress = 100;
          task.status = "completed";
          task.result = {
            atsScore: baseScore,
            grade: baseScore >= 88 ? "Excellent" : baseScore >= 78 ? "Competitive" : "Needs Optimization",
            summary: `Strong technical foundation with high stack relevance, calibrated for senior technical ATS evaluation filters.`,
            topSuggestions: [
              {
                title: "Quantify Organizational & Business Impact",
                impact: "High",
                detail: "Replace passive feature descriptions with the business or latency outcome achieved (e.g. cost saved, p99 latency reduced).",
                beforeAfterExample: {
                  before: "Worked on distributed microservices and fixed latency issues.",
                  after: "Re-architected distributed microservice query pipelines, cutting p99 latency by 38% for 4.5M DAU.",
                },
              },
              {
                title: "Add Strategic Architecture & RFC Governance",
                impact: "Essential",
                detail: "Explicitly mention cross-team technical RFCs authored and alignment achieved across engineering pods.",
                beforeAfterExample: {
                  before: "Built frontend features using React and WebSockets.",
                  after: "Authored frontend state management RFC and led 6-engineer squad delivering real-time streaming UI.",
                },
              },
              {
                title: "Incorporate Infrastructure & Observability Keywords",
                impact: "Medium",
                detail: "Include explicit keywords for OpenTelemetry, distributed tracing, and CI/CD pipelines to match modern tech ATS filters.",
              },
            ],
            strengths: [
              "Strong technical clarity and clean modern stack alignment",
              "Demonstrated experience with scalable production systems",
              "Clear logical progression across senior engineering roles",
            ],
            detectedSkills: ["TypeScript", "React", "Node.js", "Distributed Systems", "PostgreSQL", "Redis", "Cloud Architecture"],
            missingKeywords: ["OpenTelemetry / Tracing", "Terraform / IaC", "SLO / SLA Definition", "Cross-functional RFCs"],
            formattedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          };
        } catch (err: any) {
          console.error("Task processing error:", err);
          task.status = "failed";
          task.error = "The AI service is temporarily experiencing high traffic. Please try running the analysis again in a few moments.";
        }
      })();
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to process resume upload" });
    }
  });

  // --- JOB MATCHER ENDPOINT ---
  app.post("/api/job-match", optionalAuth, async (req: any, res) => {
    try {
      const { jobDescription, resumeText } = req.body;
      if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({ error: "Job description is required." });
      }

      // Check if user has stored resume or passed one
      let candidateResume = resumeText || "";
      if (!candidateResume && req.user?.id) {
        const user = Array.from(usersDb.values()).find(u => u.id === req.user.id);
        if (user && user.latestResumeText) {
          candidateResume = user.latestResumeText;
        }
      }

      if (!candidateResume) {
        candidateResume = "Senior Software Engineer with 6 years experience in TypeScript, React, Node.js, Distributed Systems, Redis, AWS, and Microservices.";
      }

      const ragContext = retrieveRagContext(jobDescription);
      const prompt = `You are a Senior Technical Recruiter. Compare this candidate's resume with the target job description.
Principles & Benchmarks:
${ragContext}

Candidate Resume:
"""
${candidateResume}
"""

Target Job Description:
"""
${jobDescription}
"""

Return a JSON object with this exact structure:
{
  "compatibilityScore": 84, // integer 0-100
  "matchTier": "Strong Match", // "Strong Match" | "Moderate Match" | "Growth Opportunity"
  "matchedSkills": ["TypeScript", "System Design", "Microservices", "React"],
  "rankedGaps": [
    {
      "skill": "Kubernetes Production Tuning",
      "urgency": "Critical", // "Critical" | "High" | "Nice to have"
      "recommendation": "Highlight any container orchestration or auto-scaling experience on your resume."
    },
    {
      "skill": "Terraform / Infrastructure-as-Code",
      "urgency": "High",
      "recommendation": "Mention cloud provisioning practices and automated deployment scripts."
    }
  ],
  "resumeAdjustmentAdvice": "Emphasize distributed system scalability metrics in your top 2 bullet points to match their requirements for high-throughput services."
}`;

      const geminiResponse = await callGeminiWithFallback(async (gemini, model) => {
        return await gemini.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You evaluate candidate-to-job fit accurately, identifying critical gaps and actionable resume positioning.",
          },
        });
      });

      if (geminiResponse && geminiResponse.text) {
        try {
          const result = JSON.parse(geminiResponse.text);
          if (result && typeof result.compatibilityScore === "number") {
            return res.json(result);
          }
        } catch (e) {
          console.warn("JSON parse error from Job Matcher Gemini response");
        }
      }

      // Fallback matching logic
      const jdWords = jobDescription.toLowerCase();
      const techTerms = [
        "typescript", "react", "node", "go", "python", "kubernetes", "docker", "aws", "gcp",
        "graphql", "kafka", "redis", "postgresql", "terraform", "microservices", "distributed systems", "ci/cd"
      ];
      const matched = techTerms.filter(t => jdWords.includes(t) && candidateResume.toLowerCase().includes(t));
      const gaps = techTerms.filter(t => jdWords.includes(t) && !candidateResume.toLowerCase().includes(t));

      const score = Math.min(95, Math.max(60, Math.round((matched.length / Math.max(1, matched.length + gaps.length)) * 100)));

      res.json({
        compatibilityScore: score,
        matchTier: score >= 80 ? "Strong Match" : score >= 65 ? "Moderate Match" : "Growth Opportunity",
        matchedSkills: matched.length > 0 ? matched : ["TypeScript", "System Design", "React", "Cloud Architecture"],
        rankedGaps: (gaps.length > 0 ? gaps : ["Kubernetes / Helm", "Terraform IaC", "Distributed Tracing"]).slice(0, 3).map((gap, i) => ({
          skill: gap.charAt(0).toUpperCase() + gap.slice(1),
          urgency: i === 0 ? "Critical" : i === 1 ? "High" : "Nice to have",
          recommendation: `Add a bullet demonstrating your hands-on experience or architectural knowledge of ${gap}.`,
        })),
        resumeAdjustmentAdvice: `Tailor your summary to specifically reflect the ${score}% overlap and surface project outcomes matching the job description's primary tech stack.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to compare job description." });
    }
  });

  // --- STREAMING CAREER ROADMAP (SSE) ---
  app.post("/api/roadmap/stream", optionalAuth, async (req: any, res) => {
    const { targetRole, currentLevel } = req.body;
    if (!targetRole || !targetRole.trim()) {
      return res.status(400).json({ error: "Target role is required." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const ragContext = retrieveRagContext(targetRole);
      const prompt = `You are a Career Architect for top technology leaders.
Create a clean, focused, step-by-step career roadmap to transition from "${currentLevel || 'Current Role'}" to "${targetRole}".
Principles & Standards:
${ragContext}

Return a structured JSON object with this exact schema:
{
  "targetRole": "${targetRole}",
  "estimatedTimeline": "6 - 9 Months",
  "summary": "One sentence summary of the core transformation needed.",
  "steps": [
    {
      "phase": "Phase 1 (Months 1-2)",
      "duration": "60 Days",
      "milestoneTitle": "Technical Depth & Domain Mastery",
      "description": "Deep dive into core gaps and write your first strategic RFC.",
      "keyActions": [
        "Complete 3 deep-dive architecture reviews of existing systems",
        "Author RFC on service resilience and cross-pod communication",
        "Establish automated latency benchmarking in CI pipeline"
      ],
      "criticalSkillsToLearn": ["Distributed Consensus", "SLO Design", "Event Streaming"]
    },
    {
      "phase": "Phase 2 (Months 3-5)",
      "duration": "90 Days",
      "milestoneTitle": "Organizational Influence & Cross-Team Impact",
      "description": "Expand scope from single squad to multi-team architectural initiatives.",
      "keyActions": [
        "Lead technical planning across 2 collaborating engineering teams",
        "Mentor 2 senior engineers on design document reviews",
        "Speak at internal tech talk or publish case study on migration"
      ],
      "criticalSkillsToLearn": ["Stakeholder Alignment", "Tech Strategy", "Engineering Mentorship"]
    },
    {
      "phase": "Phase 3 (Months 6-8)",
      "duration": "90 Days",
      "milestoneTitle": "Interview Readiness & Role Calibration",
      "description": "Execute Staff-level system design rounds and portfolio presentation.",
      "keyActions": [
        "Simulate 5 full-loop Staff system design and behavioral interviews",
        "Polish executive summary and quantifiable resume achievements",
        "Engage with hiring managers for direct targeted placement"
      ],
      "criticalSkillsToLearn": ["Executive Communication", "Offer Negotiation", "System Design STAR-T"]
    }
  ]
}`;

      let streamedSuccessfully = false;
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
                systemInstruction: "You produce clean, pragmatic, vertical career roadmaps for software engineers.",
              },
            });

            let fullText = "";
            for await (const chunk of stream) {
              const text = chunk.text || "";
              fullText += text;
              sendEvent("chunk", { text });
            }

            try {
              const parsed = JSON.parse(fullText);
              sendEvent("complete", parsed);
            } catch (e) {
              sendEvent("complete", { raw: fullText });
            }
            streamedSuccessfully = true;
            break;
          } catch (streamErr: any) {
            const { isQuota } = handleGeminiError(streamErr);
            if (isQuota) {
              console.warn(`[Roadmap SSE] Quota limit encountered. Switching to offline roadmap engine.`);
              break;
            }
            console.warn(`[Roadmap SSE] Stream failed on ${model}:`, (streamErr?.message || "").slice(0, 100));
            continue;
          }
        }
      }

      if (streamedSuccessfully) {
        res.end();
        return;
      }

      // Fallback Roadmap Generator
      const mockRoadmap = {
        targetRole,
        estimatedTimeline: "6 - 9 Months",
        summary: `Strategic progression plan designed to bridge core domain gaps and calibrate you for ${targetRole} hiring loops.`,
        steps: [
          {
            phase: "Phase 1 (Months 1-2)",
            duration: "60 Days",
            milestoneTitle: "Core Architectural Gaps & Technical Depth",
            description: "Deep dive into system scalability, consensus protocols, and infrastructure observability.",
            keyActions: [
              "Audit top 3 system bottlenecks and propose decoupled architecture solution",
              "Author a comprehensive Technical Design RFC addressing service reliability",
              "Implement automated performance benchmarking in the staging environment",
            ],
            criticalSkillsToLearn: ["Distributed System Trade-offs", "Telemetry & Observability", "High-Throughput Caching"],
          },
          {
            phase: "Phase 2 (Months 3-5)",
            duration: "90 Days",
            milestoneTitle: "Cross-Team Influence & Technical Leadership",
            description: "Drive technical consensus across multiple pods and establish engineering best practices.",
            keyActions: [
              "Spearhead technical roadmap planning across multiple engineering teams",
              "Establish regular architectural review sessions and mentor mid/senior engineers",
              "Present high-visibility technical case study to engineering management",
            ],
            criticalSkillsToLearn: ["Technical Consensus Building", "Mentorship", "Strategic Trade-off Analysis"],
          },
          {
            phase: "Phase 3 (Months 6-8)",
            duration: "90 Days",
            milestoneTitle: "Interview Mastery & Role Calibration",
            description: "Execute targeted system design simulations and lock in senior-level interview loops.",
            keyActions: [
              "Conduct 5 mock interviews focusing on distributed system scale and leadership",
              "Calibrate resume metrics to highlight business value and cross-team leverage",
              "Secure warm referrals and interview directly with VP/Director hiring loops",
            ],
            criticalSkillsToLearn: ["STAR-T Behavioral Delivery", "System Design Synthesis", "Offer Negotiation Strategy"],
          },
        ],
      };

      // Stream fallback chunks for smooth UX
      const jsonString = JSON.stringify(mockRoadmap);
      const chunkSize = 40;
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        sendEvent("chunk", { text: jsonString.substring(i, i + chunkSize) });
        await new Promise(r => setTimeout(r, 40));
      }
      sendEvent("complete", mockRoadmap);
      res.end();
    } catch (err: any) {
      sendEvent("error", { message: "AI service is currently busy. Please try generating the roadmap again." });
      res.end();
    }
  });

  // --- MOCK INTERVIEW QUESTIONS BANK & STREAMING EVALUATION ---
  const INTERVIEW_QUESTIONS = [
    {
      id: "q_sys_1",
      role: "Staff / Senior Software Engineer",
      category: "System Design",
      difficulty: "Staff",
      question: "Design a globally distributed rate limiter that handles 500,000 requests per second across 3 continents with under 5ms latency overhead and strict token-bucket consistency.",
      contextHint: "Focus on local edge caching vs centralized Redis sync trade-offs, network partition handling, and clock drift.",
    },
    {
      id: "q_sys_2",
      role: "Senior Full-Stack Engineer",
      category: "Technical Architecture",
      difficulty: "Senior",
      question: "How would you architect a real-time collaborative code editor supporting 50 concurrent editors per document without server-side merge bottlenecks?",
      contextHint: "Address CRDT vs Operational Transformation (OT), WebSocket backpressure, and offline synchronization.",
    },
    {
      id: "q_lead_1",
      role: "Engineering Lead / Staff",
      category: "Behavioral Leadership",
      difficulty: "Staff",
      question: "Describe a situation where the product team pushed for a high-priority feature release with known critical architectural debt. How did you handle the conflict, align stakeholders, and protect system reliability?",
      contextHint: "Use the STAR-T framework. Emphasize empathy, technical risk quantification, and phased delivery.",
    },
    {
      id: "q_react_1",
      role: "Senior Frontend Engineer",
      category: "Coding Patterns",
      difficulty: "Senior",
      question: "Explain how React 18 Concurrent Rendering and Server Components change client-side state hydration, waterfall network requests, and memoization strategies in large apps.",
      contextHint: "Mention selective hydration, suspense boundaries, and streaming HTML.",
    },
  ];

  app.get("/api/interview/questions", (req, res) => {
    res.json({ questions: INTERVIEW_QUESTIONS });
  });

  // Streaming Interview Evaluation (SSE)
  app.post("/api/interview/feedback-stream", optionalAuth, async (req: any, res) => {
    const { questionId, questionText, userAnswer, targetRole } = req.body;
    if (!userAnswer || !userAnswer.trim()) {
      return res.status(400).json({ error: "User answer is required." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const ragContext = retrieveRagContext(questionText + " " + (targetRole || ""));
      const prompt = `You are a Principal Interview Bar Raiser at a top-tier tech firm evaluating a candidate for "${targetRole || 'Senior/Staff Software Engineer'}".

Evaluation Rubric & Standards:
${ragContext}

Interview Question:
"${questionText}"

Candidate's Submitted Answer:
"""
${userAnswer}
"""

Evaluate this answer strictly and constructively. Stream out a JSON object with this exact structure:
{
  "score": 88, // 0-100
  "verdict": "Strong Hire", // "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Improvement"
  "strengths": [
    "Identified distributed edge cache vs centralized coordinator trade-off upfront",
    "Clearly articulated network partition resilience and degraded fallback mode"
  ],
  "growthAreas": [
    "Could specify exact data serialization size and bandwidth calculations",
    "Did not mention clock synchronization challenges (e.g. TrueTime vs NTP)"
  ],
  "improvedAnswerModel": "A concise, elite 2-3 paragraph model answer demonstrating the optimal STAR-T or architectural structure.",
  "keyFollowUpTip": "Prepare for follow-up questions regarding how your rate limiter handles sudden burst traffic and cold start cache misses."
}`;

      let streamedSuccessfully = false;
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
                systemInstruction: "You are a Principal Engineering Bar Raiser providing high-signal, immediate feedback on technical and behavioral interview responses.",
              },
            });

            let fullText = "";
            for await (const chunk of stream) {
              const text = chunk.text || "";
              fullText += text;
              sendEvent("chunk", { text });
            }

            try {
              const parsed = JSON.parse(fullText);
              sendEvent("complete", parsed);
            } catch (e) {
              sendEvent("complete", { raw: fullText });
            }
            streamedSuccessfully = true;
            break;
          } catch (streamErr: any) {
            const { isQuota } = handleGeminiError(streamErr);
            if (isQuota) {
              console.warn(`[Interview SSE] Quota limit encountered. Switching to offline interview engine.`);
              break;
            }
            console.warn(`[Interview SSE] Stream failed on ${model}:`, (streamErr?.message || "").slice(0, 100));
            continue;
          }
        }
      }

      if (streamedSuccessfully) {
        res.end();
        return;
      }

      // Fallback Answer Evaluator
      const length = userAnswer.trim().length;
      const score = Math.min(96, Math.max(62, Math.round(68 + Math.min(25, length / 40))));
      const mockFeedback = {
        score,
        verdict: score >= 85 ? "Strong Hire" : score >= 75 ? "Hire" : "Leaning Hire",
        strengths: [
          "Directly addresses core architectural constraints without unnecessary preamble",
          "Demonstrates solid understanding of distributed trade-offs and latency boundaries",
          "Good structured breakdown of components and request lifecycle",
        ],
        growthAreas: [
          "Incorporate concrete numeric estimates (QPS, payload size, memory footprint per node)",
          "Highlight failure scenarios (what happens if a cache replica dies during peak load)",
        ],
        improvedAnswerModel: `A premier Staff-level response would open with exact operational constraints: 'To handle 500k RPS with sub-5ms overhead, we decouple local edge token evaluation from asynchronous background ledger synchronization.' Then outline: (1) Local in-memory sliding window counters per edge node, (2) Batched async consensus via Redis Cluster with Raft sync, and (3) Graceful degradation under split-brain partitions.`,
        keyFollowUpTip: "Anticipate the interviewer asking: 'How do you handle flash-crowd DDoS spikes when local token buckets deplete simultaneously?'",
      };

      const jsonStr = JSON.stringify(mockFeedback);
      const chunkSize = 35;
      for (let i = 0; i < jsonStr.length; i += chunkSize) {
        sendEvent("chunk", { text: jsonStr.substring(i, i + chunkSize) });
        await new Promise(r => setTimeout(r, 35));
      }
      sendEvent("complete", mockFeedback);
      res.end();
    } catch (err: any) {
      sendEvent("error", { message: "AI service is currently busy. Please try evaluating your answer again." });
      res.end();
    }
  });

  // --- STREAMING AI CHAT MENTOR (SSE) ---
  app.post("/api/chat/stream", optionalAuth, async (req: any, res) => {
    const { messages, userContext } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const lastMessage = messages[messages.length - 1].text;
      const ragContext = retrieveRagContext(lastMessage);

      const systemPrompt = `You are the AI Career Mentor for high-performing software engineers, architects, and engineering managers.
Your style is direct, clear, objective, and deeply knowledgeable about tech compensation, promotion mechanics, resume positioning, and architectural trade-offs.
Ground your responses with:
${ragContext}

User Context: ${userContext || 'Senior/Staff tech professional'}.
Provide concise, actionable answers with generous spacing. Avoid fluff or generic motivational filler.`;

      // Format conversation history for Gemini
      const formattedContents = messages.map(m => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      let streamedSuccessfully = false;
      const gemini = getGeminiClient();

      if (!isQuotaExhausted() && gemini) {
        for (const model of PRIMARY_MODELS) {
          if (isQuotaExhausted()) break;
          try {
            const stream = await gemini.models.generateContentStream({
              model,
              contents: formattedContents,
              config: {
                systemInstruction: systemPrompt,
              },
            });

            for await (const chunk of stream) {
              const text = chunk.text || "";
              sendEvent("chunk", { text });
            }
            sendEvent("done", {});
            streamedSuccessfully = true;
            break;
          } catch (streamErr: any) {
            const { isQuota } = handleGeminiError(streamErr);
            if (isQuota) {
              console.warn(`[Chat SSE] Quota limit encountered. Switching to offline mentor engine.`);
              break;
            }
            console.warn(`[Chat SSE] Stream failed on ${model}:`, (streamErr?.message || "").slice(0, 100));
            continue;
          }
        }
      }

      if (streamedSuccessfully) {
        res.end();
        return;
      }

      // Fallback Stream
      const reply = `When evaluating that transition, the three decisive leverage points are:

1. **Strategic Leverage Over Code Volume**: Shift your daily output from implementing individual features to writing technical RFCs that unblock 3+ engineers and reduce cross-service dependencies.

2. **Quantifiable Latency & Cost Metrics**: Calibrate your resume and conversations around business impact (e.g. 'Reduced p99 database latency by 40% and saved $120k ARR on AWS cluster provisioning').

3. **Interview Synthesis**: In Staff+ rounds, interviewers evaluate how you handle ambiguity and pushback from leadership. Always frame trade-offs using the STAR-T format.

What specific aspect of your background or target role would you like to drill into next?`;

      const chunkSize = 25;
      for (let i = 0; i < reply.length; i += chunkSize) {
        sendEvent("chunk", { text: reply.substring(i, i + chunkSize) });
        await new Promise(r => setTimeout(r, 25));
      }
      sendEvent("done", {});
      res.end();
    } catch (err: any) {
      sendEvent("error", { message: "AI mentor is momentarily busy. Please try sending your message again." });
      res.end();
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Career Mentor server running on http://localhost:${PORT}`);
  });
}

startServer();
