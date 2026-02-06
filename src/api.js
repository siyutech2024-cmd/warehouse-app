import { store } from "./store";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// 模拟 AI 分析
const mockProducts = [
  { name: "苹果 MacBook Pro 14英寸", category: "电子产品", description: "Apple M3 Pro 芯片，18GB 内存，512GB 存储" },
  { name: "Sony WH-1000XM5 无线耳机", category: "电子产品", description: "行业领先降噪，30小时续航" },
  { name: "小米智能手环 8", category: "电子产品", description: "1.62英寸 AMOLED 屏幕，16天超长续航" },
  { name: "办公桌椅套装", category: "办公用品", description: "人体工学设计，舒适办公体验" },
  { name: "文件收纳盒", category: "办公用品", description: "多层设计，A4纸张完美收纳" },
  { name: "保温杯 500ml", category: "生活用品", description: "316不锈钢内胆，24小时保温" },
  { name: "USB-C 多功能集线器", category: "电子产品", description: "7合1设计，支持4K HDMI输出" },
  { name: "无线充电器", category: "电子产品", description: "15W快充，兼容手机手表耳机" }
];

export async function analyzeImage(imageBase64) {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];
  const basePrice = Math.floor(Math.random() * 900) + 100;

  return {
    name: randomProduct.name,
    description: randomProduct.description,
    category: randomProduct.category,
    originalPrice: basePrice,
    discountPrice: Math.round(basePrice * 0.7),
    stock: Math.floor(Math.random() * 50) + 1
  };
}
export const analyzeProductImage = analyzeImage;


export async function analyzeBarcode(barcode) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const product = mockProducts.find(p => p.name.includes('MacBook')) || mockProducts[0];
    return {
          ...product,
          barcode: barcode,
          price: Math.floor(Math.random() * 900) + 100,
          stock: Math.floor(Math.random() * 50) + 1
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

export function exportExcel(data) {
  const formattedData = data.map((item, index) => ({
    "序号": index + 1,
    "产品名称": item.name,
    "描述": item.description || "",
    "分类": item.category || "未分类",
    "条形码": item.barcode,
    "原价": item.originalPrice,
    "折扣价": item.discountPrice,
    "库存": item.stock,
    "录入人": item.createdBy || "-",
    "入库时间": item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : "-"
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "库存清单");

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 6 },  // 序号
    { wch: 30 }, // 产品名称
    { wch: 40 }, // 描述
    { wch: 12 }, // 分类
    { wch: 15 }, // 条形码
    { wch: 10 }, // 原价
    { wch: 10 }, // 折扣价
    { wch: 8 },  // 库存
    { wch: 12 }, // 录入人
    { wch: 20 }  // 入库时间
  ];

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  const fileName = `库存清单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
  saveAs(blob, fileName);
}
