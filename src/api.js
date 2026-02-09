import { store } from "./store";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import i18n from "./i18n";

// Google Gemini API Key（从环境变量读取，避免泄露）
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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

// 获取含图片的完整数据（仅导出 Excel 时使用）
export async function fetchInventoryWithImages() {
  return await store.getInventoryWithImages();
}

// 获取单个产品图片（懒加载缩略图用）
export async function getProductImage(productId) {
  return await store.getProductImage(productId);
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

// 导出 Excel - 支持筛选条件和图片嵌入
export async function exportExcel(data, filters = {}) {
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

  // 使用 ExcelJS 创建工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Warehouse App';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Inventario', {
    properties: { defaultRowHeight: 60 }
  });

  // 定义列
  worksheet.columns = [
    { header: 'No.', key: 'no', width: 6 },
    { header: 'Imagen', key: 'image', width: 15 },
    { header: 'Producto', key: 'name', width: 30 },
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Categoría', key: 'category', width: 14 },
    { header: 'Precio Original', key: 'originalPrice', width: 14 },
    { header: 'Precio Descuento', key: 'discountPrice', width: 14 },
    { header: 'Stock', key: 'stock', width: 8 },
    { header: 'Creador', key: 'createdBy', width: 12 },
    { header: 'Fecha', key: 'createdAt', width: 20 }
  ];

  // 样式化表头
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // 添加数据和图片
  for (let i = 0; i < filteredData.length; i++) {
    const item = filteredData[i];
    const rowIndex = i + 2; // 第一行是表头

    const row = worksheet.addRow({
      no: i + 1,
      image: '', // 图片列占位
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'Sin categoría',
      originalPrice: item.originalPrice || 0,
      discountPrice: item.discountPrice || 0,
      stock: item.stock || 0,
      createdBy: item.createdBy || '-',
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('es-ES') : '-'
    });

    row.height = 60;
    row.alignment = { vertical: 'middle', wrapText: true };

    // 嵌入产品图片
    if (item.image && item.image.startsWith('data:')) {
      try {
        // 从 data URI 中提取 base64 数据
        const base64Data = item.image.split(',')[1];
        const extension = item.image.includes('png') ? 'png' : 'jpeg';

        const imageId = workbook.addImage({
          base64: base64Data,
          extension: extension,
        });

        worksheet.addImage(imageId, {
          tl: { col: 1, row: rowIndex - 1 }, // 图片左上角
          ext: { width: 80, height: 55 } // 图片尺寸(像素)
        });
      } catch (imgError) {
        console.warn(`⚠️ Could not embed image for row ${rowIndex}:`, imgError);
        // 图片嵌入失败时在单元格显示文字
        row.getCell('image').value = '(imagen no disponible)';
      }
    } else {
      row.getCell('image').value = '(sin imagen)';
    }
  }

  // 添加边框样式
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };
    });
  });

  // 生成并下载
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
