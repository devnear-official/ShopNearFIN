import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Setting } from "@/models/Setting";
import { getSessionFromRequest } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { executeAiTool } from "@/lib/ai-assistant-tools";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const AI_TOOLS: any = [
  {
    functionDeclarations: [
      {
        name: "getProducts",
        description: "Fetch product catalog, current stock, buying price, selling price, and SKU.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            search: {
              type: SchemaType.STRING,
              description: "Optional product name or SKU keyword",
            },
            lowStockOnly: {
              type: SchemaType.BOOLEAN,
              description: "Filter products with stock at or below low stock limit",
            },
          },
        },
      },
      {
        name: "getFinancialSummary",
        description: "Calculate delivered sales revenue, buying cost (COGS), gross profit, all expenses, net profit, and profit margin for a timeframe.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            timeframe: {
              type: SchemaType.STRING,
              description: "Timeframe: 'today', 'this_week', 'this_month', 'last_month', or 'all_time'",
            },
          },
        },
      },
      {
        name: "getExpensesBreakdown",
        description: "Fetch itemized expenses, categories (ADVERTISING, OFFICE_RENT, PACKAGING, SALARY, RETURN_LOSS, etc.), notes, and amounts.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            category: {
              type: SchemaType.STRING,
              description: "Optional expense category (e.g. ADVERTISING, PACKAGING, SALARY)",
            },
            timeframe: {
              type: SchemaType.STRING,
              description: "Timeframe: 'today', 'this_week', 'this_month', 'last_month', or 'all_time'",
            },
          },
        },
      },
      {
        name: "getOrdersSummary",
        description: "Get summary of orders count by status (PENDING, CONFIRMED, SHIPPED, DELIVERED, RETURNED, CANCELLED) and recent orders.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            status: {
              type: SchemaType.STRING,
              description: "Optional order status filter",
            },
          },
        },
      },
      {
        name: "getAccountBalances",
        description: "Get real-time liquid balances of Cash in Hand, Vault, bKash, Nagad, and Bank.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: "getPartnersSummary",
        description: "Fetch partner investments, withdrawals, and profit sharing percentages.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `
You are ShopNearFin AI, an expert e-commerce financial controller and business advisor for a Bangladeshi online retail business.
Your primary job is to answer the user's questions about product stock, buying/selling prices, monthly profits, advertising expenses, cash/vault balances, and order statuses.

Rules:
1. ALWAYS use the provided tools to query real database figures before answering. Never guess numbers.
2. Present financial numbers clearly in BDT (৳ / Taka), formatted neatly (e.g. ৳১,৫০০ or 1,500 tk).
3. By default, reply in polite, fluent, natural Bengali (বাংলা) unless the user explicitly asks in English.
4. Keep answers concise, actionable, and formatted with bullet points or bold highlights.
5. If net profit is discussed, clearly show: Delivered Revenue - Product Cost (COGS) - Expenses = Net Profit.
6. If the user asks general business advice, combine their real database statistics with practical e-commerce tips.
`;

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const prompt = body?.message?.trim() || "";
    if (!prompt) {
      return errorResponse("Message is required", "VALIDATION_ERROR", 400);
    }

    await connectDB();
    const settings = await Setting.findOne();

    const apiKey = process.env.GEMINI_API_KEY || settings?.geminiApiKey;
    if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_gemini_api_key_here")) {
      return successResponse({
        reply: "⚠️ **Gemini API Key কনফিগার করা হয়নি!**\n\nদয়া করে আপনার Gemini API Key সেট করুন:\n1. **Settings** পেজে গিয়ে **Gemini AI API Key** ঘরে আপনার কী (Key) পেস্ট করে Save করুন, অথবা\n2. প্রজেক্টের `.env.local` ফাইলে `GEMINI_API_KEY=YOUR_KEY` দিন।\n\nGoogle AI Studio (https://aistudio.google.com/app/apikey) থেকে সম্পূর্ণ বিনামূল্যে এই API Key পাওয়া যায়।",
        missingKey: true,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: AI_TOOLS,
    });

    const chat = model.startChat({
      history: (body?.history || []).map((h: any) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
    });

    let result = await chat.sendMessage(prompt);
    let response = result.response;

    // Handle tool calling loop (up to 5 turns to prevent infinite loops)
    let turns = 0;
    while (turns < 5) {
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      turns++;
      const toolResponses = [];
      for (const call of functionCalls) {
        const toolResult = await executeAiTool(call.name, call.args);
        toolResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        });
      }

      result = await chat.sendMessage(toolResponses);
      response = result.response;
    }

    const reply = response.text();

    return successResponse({
      reply,
      missingKey: false,
    });
  } catch (error: any) {
    console.error("AI Chat error:", error);
    const message = error.message || "Failed to process AI request";
    if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
      return successResponse({
        reply: "❌ **Gemini API Key টি সঠিক নয় বা ভ্যালিড নয়!**\n\nদয়া করে Google AI Studio থেকে সঠিক API Key কপি করে Settings পেজে বা `.env.local` ফাইলে বসিয়ে পুনরায় চেষ্টা করুন।",
        missingKey: true,
      });
    }
    return errorResponse(message, "SERVER_ERROR", 500);
  }
}
