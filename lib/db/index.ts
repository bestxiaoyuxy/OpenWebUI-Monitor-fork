import { query } from "./client";
import { ensureUserTableExists } from "./users";

// 创建模型价格表
async function ensureModelPricesTableExists() {
  const defaultInputPrice = parseFloat(
    process.env.DEFAULT_MODEL_INPUT_PRICE || "60"
  );
  const defaultOutputPrice = parseFloat(
    process.env.DEFAULT_MODEL_OUTPUT_PRICE || "60"
  );

  await query(
    `CREATE TABLE IF NOT EXISTS model_prices (
      model_id TEXT PRIMARY KEY,
      model_name TEXT NOT NULL,
      input_price DECIMAL(10, 6) DEFAULT CAST($1 AS DECIMAL(10, 6)),
      output_price DECIMAL(10, 6) DEFAULT CAST($2 AS DECIMAL(10, 6))
    );`,
    [defaultInputPrice, defaultOutputPrice]
  );
}

export async function ensureTablesExist() {
  await ensureModelPricesTableExists();
  await ensureUserTableExists();
}

// 添加 ModelPrice 接口定义
interface ModelPrice {
  model_id: string;
  model_name: string;
  input_price: number;
  output_price: number;
}

export async function getOrCreateModelPrice(
  id: string,
  name: string
): Promise<ModelPrice> {
  try {
    const result = await query(
      `INSERT INTO model_prices (model_id, model_name)
       VALUES ($1, $2)
       ON CONFLICT (model_id) DO UPDATE SET model_name = $2
       RETURNING *`,
      [id, name]
    );

    return {
      ...result.rows[0],
      input_price: Number(result.rows[0].input_price),
      output_price: Number(result.rows[0].output_price),
    };
  } catch (error: any) {
    console.error("Error in getOrCreateModelPrice:", error);
    if (error.message.includes("Connection terminated unexpectedly")) {
      console.log("Retrying database connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return getOrCreateModelPrice(id, name);
    }
    throw error;
  }
}

export async function updateModelPrice(
  modelId: string,
  input_price: number,
  output_price: number
) {
  const result = await query(
    `UPDATE model_prices 
    SET 
      input_price = CAST($2 AS DECIMAL(10,6)),
      output_price = CAST($3 AS DECIMAL(10,6))
    WHERE model_id = $1
    RETURNING *;`,
    [modelId, input_price, output_price]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    ...result.rows[0],
    input_price: Number(result.rows[0].input_price),
    output_price: Number(result.rows[0].output_price),
  };
}

export * from "./users";
