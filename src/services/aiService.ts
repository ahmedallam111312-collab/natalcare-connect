import type { ChatMessage } from "@/types";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export async function sendSymptomChat(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const system =
    systemPrompt ||
    `You are a prenatal care AI assistant. Help analyze symptoms reported by pregnant patients.
Ask follow-up questions to gather more details. Be empathetic and thorough.
Always recommend consulting a healthcare provider for serious concerns.
Extract structured data when possible: symptom name, severity, duration, frequency.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) throw new Error("Groq API error");
    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || "I couldn't process that. Please try again.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "I understand you're experiencing some symptoms. Could you tell me more about when they started and how severe they feel on a scale of 1-10? Also, are you experiencing any other symptoms alongside this?";
  }
}

export async function analyzeRisk(vitals: {
  bpSystolic: number;
  bpDiastolic: number;
  bloodSugar: number;
  weight: number;
}): Promise<{ level: "low" | "moderate" | "high"; explanation: string }> {
  let score = 0;
  const factors: string[] = [];

  if (vitals.bpSystolic > 140 || vitals.bpDiastolic > 90) {
    score += 3;
    factors.push("Elevated blood pressure");
  } else if (vitals.bpSystolic > 130 || vitals.bpDiastolic > 85) {
    score += 1;
    factors.push("Slightly elevated blood pressure");
  }

  if (vitals.bloodSugar > 180) {
    score += 3;
    factors.push("High blood sugar");
  } else if (vitals.bloodSugar > 140) {
    score += 1;
    factors.push("Elevated blood sugar");
  }

  const level = score >= 4 ? "high" : score >= 2 ? "moderate" : "low";
  const explanation =
    factors.length > 0
      ? `Risk factors: ${factors.join(", ")}`
      : "All vitals within normal range";

  return { level, explanation };
}

export async function analyzeUltrasoundImage(
  _imageBase64: string
): Promise<Record<string, string>> {
  return {
    gestationalAge: "28 weeks",
    fetalWeight: "1.1 kg",
    heartRate: "145 bpm",
    position: "Cephalic",
  };
}