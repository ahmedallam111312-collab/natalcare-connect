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
  const prompt = `You are an expert AI obstetrician. Analyze the following patient vitals:
Blood Pressure: ${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg
Blood Sugar: ${vitals.bloodSugar} mg/dL
Weight: ${vitals.weight} kg

Determine the pregnancy risk level based on these specific vitals.
Return ONLY a valid JSON object in the exact following format, with no markdown formatting or extra text:
{"level": "low" | "moderate" | "high", "explanation": "A concise Arabic explanation of why this level was chosen and what it means."}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Low temp for more deterministic output
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error("Groq API error");
    const data: GroqResponse = await response.json();
    const resultContent = data.choices[0]?.message?.content;
    
    if (resultContent) {
      const parsed = JSON.parse(resultContent);
      return {
        level: parsed.level || "moderate",
        explanation: parsed.explanation || "تم تحليل البيانات بنجاح."
      };
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("AI Risk Analysis Error:", error);
    // Fallback to basic rule-based logic if API fails
    let score = 0;
    const factors: string[] = [];

    if (vitals.bpSystolic > 140 || vitals.bpDiastolic > 90) { score += 3; factors.push("ارتفاع ضغط الدم"); }
    else if (vitals.bpSystolic > 130 || vitals.bpDiastolic > 85) { score += 1; factors.push("تغير طفيف بضغط الدم"); }

    if (vitals.bloodSugar > 180) { score += 3; factors.push("ارتفاع السكر"); }
    else if (vitals.bloodSugar > 140) { score += 1; factors.push("تغير طفيف بالسكر"); }

    const level = score >= 4 ? "high" : score >= 2 ? "moderate" : "low";
    const explanation = factors.length > 0 ? `مؤشرات تتطلب الملاحظة: ${factors.join("، ")}` : "جميع المؤشرات الحيوية ضمن النطاق الطبيعي";

    return { level, explanation };
  }
}

export async function analyzeUltrasoundImage(
  imageBase64: string
): Promise<Record<string, string>> {
  const prompt = `You are a medical AI assistant analyzing ultrasound or medical lab reports.
Analyze the provided image and extract any relevant medical metrics such as Gestational Age, Fetal Weight, Heart Rate, Position, or any other visible medical values.
Return the extracted metrics as a simple flat JSON key-value pair object (all keys and values must be strings in Arabic when appropriate, e.g., "عمر الجنين", "نبض القلب").
Do not include any extra text, markdown formatting, or explanations. ONLY return the JSON object.
If the image is not a medical report or no metrics are visible, return {"ملاحظة": "لم يتم العثور على بيانات طبية واضحة في الصورة"}.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) throw new Error("Groq Vision API error");
    const data: GroqResponse = await response.json();
    let resultContent = data.choices[0]?.message?.content || "{}";
    
    // Clean up potential markdown formatting that the model might incorrectly return
    if (resultContent.startsWith("```json")) {
      resultContent = resultContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    
    return JSON.parse(resultContent);
  } catch (error) {
    console.error("AI Vision Analysis Error:", error);
    return {
      "خطأ": "تعذر تحليل الصورة حالياً بواسطة الذكاء الاصطناعي."
    };
  }
}