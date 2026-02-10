import { store } from "./store";
import ExcelJS from "exceljs";
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
export async function fetchInventoryWithImages(onProgress) {
  return await store.getInventoryWithImages(onProgress);
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

  // 辅助函数：从 data URI 中检测 ExcelJS 支持的图片扩展名
  const getSupportedImageExtension = (dataUri) => {
    if (!dataUri || !dataUri.startsWith('data:image/')) return null;
    const mimeMatch = dataUri.match(/^data:image\/([\w+]+);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1].toLowerCase();
    // ExcelJS 只支持 png, jpeg, gif
    if (mime === 'png') return 'png';
    if (mime === 'jpeg' || mime === 'jpg') return 'jpeg';
    if (mime === 'gif') return 'gif';
    // webp, svg, bmp 等不受支持
    console.warn(`⚠️ Unsupported image format: ${mime}, skipping image`);
    return null;
  };

  // 内部函数：填充工作表数据（可选是否包含图片）
  const fillWorksheet = (ws, wb, data, includeImages) => {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const rowIndex = i + 2; // 第一行是表头

      const row = ws.addRow({
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

      // 嵌入产品图片（仅当 includeImages 为 true 时）
      if (includeImages && item.image && item.image.startsWith('data:')) {
        const extension = getSupportedImageExtension(item.image);
        if (extension) {
          try {
            const base64Data = item.image.split(',')[1];
            const imageId = wb.addImage({
              base64: base64Data,
              extension: extension,
            });
            ws.addImage(imageId, {
              tl: { col: 1, row: rowIndex - 1 },
              ext: { width: 80, height: 55 }
            });
          } catch (imgError) {
            console.warn(`⚠️ Could not embed image for row ${rowIndex}:`, imgError);
            row.getCell('image').value = '(imagen no disponible)';
          }
        } else {
          row.getCell('image').value = '(formato no soportado)';
        }
      } else {
        row.getCell('image').value = includeImages ? '(sin imagen)' : '-';
      }
    }

    // 添加边框样式
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
      });
    });
  };

  // 检查数据中是否有任何支持的图片
  const hasAnyImages = filteredData.some(item =>
    item.image && item.image.startsWith('data:') && getSupportedImageExtension(item.image)
  );

  // 填充数据
  fillWorksheet(worksheet, workbook, filteredData, hasAnyImages);

  // 生成并下载（如果图片导致失败，自动重试不含图片版本）
  let buffer;
  try {
    buffer = await workbook.xlsx.writeBuffer();
  } catch (writeError) {
    console.warn('⚠️ Excel generation with images failed, retrying without images:', writeError.message);
    // 重新创建不含图片的工作簿
    const wb2 = new ExcelJS.Workbook();
    wb2.creator = 'Warehouse App';
    wb2.created = new Date();
    const ws2 = wb2.addWorksheet('Inventario', {
      properties: { defaultRowHeight: 60 }
    });
    ws2.columns = [
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
    const headerRow2 = ws2.getRow(1);
    headerRow2.height = 25;
    headerRow2.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };
    fillWorksheet(ws2, wb2, filteredData, false);
    buffer = await wb2.xlsx.writeBuffer();
  }

  const fileName = `Inventario_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.xlsx`;
  // 使用 File 对象（而非 Blob），Safari 会从 File 名称读取文件名
  const file = new File([buffer], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // 延迟清理，确保浏览器有时间处理下载
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);

  return filteredData.length;
}

// 获取筛选选项
export async function getFilterOptions() {
  const inventory = await store.getInventory() || [];

  const categories = [...new Set(inventory.map(item => item.category).filter(Boolean))];
  const employees = [...new Set(inventory.map(item => item.createdBy).filter(Boolean))];

  return { categories, employees };
}
