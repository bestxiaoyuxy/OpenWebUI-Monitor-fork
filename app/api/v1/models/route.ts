import { NextResponse } from "next/server";
import { ensureTablesExist, getOrCreateModelPrices } from "@/lib/db";

interface ModelInfo {
  id: string;
  base_model_id: string;
  name: string;
  params: {
    system: string;
  };
  meta: {
    profile_image_url: string;
  };
}

interface ModelResponse {
  data: {
    id: string;
    name: string;
    info: ModelInfo;
  }[];
}

export async function GET() {
  try {
    // Ensure database is initialized
    await ensureTablesExist();

    const domain = process.env.OPENWEBUI_DOMAIN;
    if (!domain) {
      throw new Error("OPENWEBUI_DOMAIN environment variable is not set.");
    }

    // Normalize API URL
    const apiUrl = domain.replace(/\/+$/, "") + "/api/models";

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.OPENWEBUI_API_KEY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("API response status:", response.status);
      console.error("API response text:", await response.text());
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    // Get response text for debugging
    const responseText = await response.text();
    // console.log("API response:", responseText);

    let data: ModelResponse;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      throw new Error("Invalid JSON response from API");
    }

    console.log("data:", data);

    if (!data || !Array.isArray(data.data)) {
      console.error("Unexpected API response structure:", data);
      throw new Error("Unexpected API response structure");
    }

    // Get price information for all models
    const modelsWithPrices = await getOrCreateModelPrices(
      data.data.map((item) => {
        // 处理形如 gemini_search.gemini-2.0-flash 的派生模型ID
        let baseModelId = item.info?.base_model_id;

        // 如果没有明确的base_model_id，尝试从ID中提取
        if (!baseModelId && item.id) {
          const idParts = String(item.id).split(".");
          if (idParts.length > 1) {
            baseModelId = idParts[idParts.length - 1];
          }
        }

        return {
          id: String(item.id),
          name: String(item.name),
          base_model_id: baseModelId,
        };
      })
    );

    const validModels = data.data.map((item, index) => {
      // 处理形如 gemini_search.gemini-2.0-flash 的派生模型ID
      let baseModelId = item.info?.base_model_id || "";

      // 如果没有明确的base_model_id，尝试从ID中提取
      if (!baseModelId && item.id) {
        const idParts = String(item.id).split(".");
        if (idParts.length > 1) {
          baseModelId = idParts[idParts.length - 1];
        }
      }

      return {
        id: modelsWithPrices[index].id,
        base_model_id: baseModelId,
        name: modelsWithPrices[index].name,
        imageUrl: item.info?.meta?.profile_image_url || "/static/favicon.png",
        system_prompt: item.info?.params?.system || "",
        input_price: modelsWithPrices[index].input_price,
        output_price: modelsWithPrices[index].output_price,
        per_msg_price: modelsWithPrices[index].per_msg_price,
        updated_at: modelsWithPrices[index].updated_at,
      };
    });

    return NextResponse.json(validModels);
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch models",
      },
      { status: 500 }
    );
  }
}

// Add inlet endpoint
export async function POST(req: Request) {
  const data = await req.json();

  return new Response("Inlet placeholder response", {
    headers: { "Content-Type": "application/json" },
  });
}

// Add outlet endpoint
export async function PUT(req: Request) {
  const data = await req.json();
  // console.log("Outlet received:", JSON.stringify(data, null, 2));

  return new Response("Outlet placeholder response", {
    headers: { "Content-Type": "application/json" },
  });
}
