import { store } from "./store";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import i18n from "./i18n";

// Google Gemini API Key
const GEMINI_API_KEY = "AIzaSyBf37bJO2GYlY0FToiZG12I72F-sZglYDA";

// 生成唯一条形码
export function generateBarcode() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WH${timestamp}${random}`;
}

// 检查条形码是否已存在
export async function checkBarcodeExists(barcode) {
  if (!barcode || barcode.length < 3) return false;

  try {
    const inventory = await store.getInventory();
    return inventory.some(item => item.barcode === barcode);
  } catch (error) {
    console.error("Error checking barcode:", error);
    return false;
  }
}

// 使用 Google Gemini AI 分析产品图片
export async function analyzeImage(imageBase64, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  console.log(`🤖 Starting Gemini AI analysis... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

  try {
    // 移除 data:image/... 前缀
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    console.log("📸 Image data length:", base64Data.length);

    const requestBody = {
      contents: [{
        parts: [
          {
            text: `Eres un experto en productos y precios del mercado mexicano. Analiza esta imagen de producto y devuelve SOLO un JSON válido con este formato exacto (sin markdown, sin explicaciones):
{
  "name": "nombre del producto en español",
  "description": "descripción breve en español (máximo 100 caracteres)",
  "category": "una de: Electrónica, Oficina, Hogar, Ropa, Alimentos, Bebidas, Limpieza, Herramientas, Juguetes, Otros",
  "originalPrice": precio estimado en PESOS MEXICANOS (MXN) basado en precios reales del mercado mexicano (solo número, sin símbolo),
  "stock": 10
}
IMPORTANTE: 
- El precio debe ser realista y basado en precios de mercado mexicano (tiendas como Walmart, Chedraui, Soriana, Amazon México)
- Considera el tipo de producto, marca visible (si hay), y calidad aparente
- Precios comunes de referencia en MXN: snack $15-50, bebida $20-40, electrónico pequeño $200-1000, ropa básica $150-500
Si no puedes identificar el producto, usa valores genéricos razonables.`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data
            }
          }
        ]
      }]
    };

    console.log("📤 Sending request to Gemini API...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    console.log("📥 Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("📥 API Response:", JSON.stringify(data, null, 2));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log("📝 Extracted text:", text);

    if (!text) {
      throw new Error("Empty response from AI");
    }

    // 清理 JSON 响应
    let jsonStr = text.trim();
    // 移除可能的 markdown 代码块
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    console.log("🔧 Cleaned JSON:", jsonStr);

    const result = JSON.parse(jsonStr);
    console.log("✅ Parsed result:", result);

    // 计算折扣价
    const originalPrice = Number(result.originalPrice) || 100;

    return {
      name: result.name || "Producto Desconocido",
      description: result.description || "Sin descripción",
      category: result.category || "Otros",
      originalPrice: originalPrice,
      discountPrice: Math.round(originalPrice * 0.7),
      stock: result.stock || 10
    };
  } catch (error) {
    console.error("❌ Gemini AI Error:", error);
    console.error("Error details:", error.message);

    // 检查是否为 429 配额错误，如果是则重试
    if (error.message?.includes('429') && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount];
      console.log(`⏳ Rate limited. Waiting ${delay / 1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return analyzeImage(imageBase64, retryCount + 1);
    }

    // 返回后备数据但标记为失败
    return {
      name: "Producto (análisis fallido)",
      description: error.message?.includes('429')
        ? "API límite alcanzado. Espere 1-2 minutos e intente de nuevo."
        : `Error: ${error.message}. Por favor edite manualmente.`,
      category: "Otros",
      originalPrice: 100,
      discountPrice: 70,
      stock: 10
    };
  }
}

export const analyzeProductImage = analyzeImage;

export async function analyzeBarcode(barcode) {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    name: "Producto Escaneado",
    description: "Producto identificado por código de barras",
    category: "Otros",
    barcode: barcode,
    originalPrice: 100,
    discountPrice: 70,
    stock: 10
  };
}

export async function createProduct(data) {
  store.setProduct(data);
  return data;
}

export async function saveInventory(item) {
  return await store.addInventory(item);
}

export async function fetchInventory() {
  return await store.getInventory();
}

export async function fetchMyInventory(username) {
  return await store.getMyInventory(username);
}

export async function updateProductStock(id, stock) {
  return await store.updateStock(id, stock);
}

export async function deleteProducts(ids) {
  return await store.deleteProducts(ids);
}

export async function updateProductPrice(id, originalPrice, discountPrice) {
  return await store.updatePrice(id, originalPrice, discountPrice);
}

// 导出 Excel - 支持筛选条件
export function exportExcel(data, filters = {}) {
  let filteredData = [...data];

  // 应用日期筛选
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    filteredData = filteredData.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start;
    });
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    filteredData = filteredData.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate <= end;
    });
  }

  // 应用分类筛选
  if (filters.category && filters.category !== 'all') {
    filteredData = filteredData.filter(item => item.category === filters.category);
  }

  // 应用员工筛选
  if (filters.employee && filters.employee !== 'all') {
    filteredData = filteredData.filter(item => item.createdBy === filters.employee);
  }

  const formattedData = filteredData.map((item, index) => ({
    "No.": index + 1,
    "Producto": item.name,
    "Descripción": item.description || "",
    "Categoría": item.category || "Sin categoría",
    "Código de Barras": item.barcode,
    "Precio Original": item.originalPrice,
    "Precio Descuento": item.discountPrice,
    "Stock": item.stock,
    "Creador": item.createdBy || "-",
    "Fecha": item.createdAt ? new Date(item.createdAt).toLocaleString('es-ES') : "-"
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 6 },  // No.
    { wch: 30 }, // Producto
    { wch: 40 }, // Descripción
    { wch: 12 }, // Categoría
    { wch: 15 }, // Código de Barras
    { wch: 10 }, // Precio Original
    { wch: 10 }, // Precio Descuento
    { wch: 8 },  // Stock
    { wch: 12 }, // Creador
    { wch: 20 }  // Fecha
  ];

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  const fileName = `Inventario_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.xlsx`;
  saveAs(blob, fileName);

  return filteredData.length;
}

// 获取筛选选项
export async function getFilterOptions() {
  const inventory = await store.getInventory() || [];

  const categories = [...new Set(inventory.map(item => item.category).filter(Boolean))];
  const employees = [...new Set(inventory.map(item => item.createdBy).filter(Boolean))];

  return { categories, employees };
}
