import { supabase, isSupabaseEnabled } from './lib/supabase';

// ==================== localStorage 兼容层 ====================
const loadFromStorage = () => {
  try {
    const data = localStorage.getItem('warehouse_data');
    return data ? JSON.parse(data) : { product: null, inventory: [], currentUser: null };
  } catch (e) {
    console.error('加载数据失败:', e);
    return { product: null, inventory: [], currentUser: null };
  }
};

const saveToStorage = (data) => {
  try {
    localStorage.setItem('warehouse_data', JSON.stringify(data));
  } catch (e) {
    console.error('保存数据失败:', e);
  }
};

// ==================== Supabase 数据层 ====================
const supabaseStore = {
  currentUser: null,
  product: null,

  async setCurrentUser(user) {
    this.currentUser = user;
    if (!user) {
      localStorage.removeItem('warehouse_current_user');
      return;
    }
    localStorage.setItem('warehouse_current_user', JSON.stringify(user));

    // 同步到 Supabase
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('users').upsert({
        username: user.username,
        role: user.role,
        status: 'active'
      }, { onConflict: 'username' });
      if (error) console.error('同步用户失败:', error);
    }
  },

  loadCurrentUser() {
    const stored = localStorage.getItem('warehouse_current_user');
    this.currentUser = stored ? JSON.parse(stored) : null;
    return this.currentUser;
  },

  setProduct(product) {
    this.product = product;
  },

  async addInventory(item) {
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      created_by: this.currentUser?.username || 'unknown',
      created_by_role: this.currentUser?.role || 'EMPLOYEE',
      created_at: new Date().toISOString()
    };

    if (isSupabaseEnabled) {
      // 如果没有条码，自动生成唯一内部编码
      const barcode = newItem.barcode || `AUTO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const { error } = await supabase.from('products').insert({
        name: newItem.name,
        description: newItem.description,
        category: newItem.category,
        barcode: barcode,
        original_price: newItem.originalPrice,
        discount_price: newItem.discountPrice,
        stock: newItem.stock,
        image: newItem.image,
        created_by: newItem.created_by,
        created_by_role: newItem.created_by_role
      });
      if (error) {
        console.error('添加库存失败:', error);
        throw error;
      }
    }

    this.product = null;
    return newItem;
  },

  // 列表查询 — 不加载 image 字段（节省 95%+ 传输量）
  async getInventory() {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category, barcode, original_price, discount_price, stock, created_by, created_by_role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取库存失败:', error);
        return [];
      }

      return data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        barcode: item.barcode,
        originalPrice: item.original_price,
        discountPrice: item.discount_price,
        stock: item.stock,
        image: null,
        createdBy: item.created_by,
        createdByRole: item.created_by_role,
        createdAt: item.created_at
      }));
    }
    return [];
  },

  async getMyInventory(username) {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category, barcode, original_price, discount_price, stock, created_by, created_at')
        .eq('created_by', username)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取我的库存失败:', error);
        return [];
      }

      return data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        barcode: item.barcode,
        originalPrice: item.original_price,
        discountPrice: item.discount_price,
        stock: item.stock,
        image: null,
        createdBy: item.created_by,
        createdAt: item.created_at
      }));
    }
    return [];
  },

  // 获取含图片的完整数据（仅导出 Excel 时使用）
  // 分批获取图片，避免 Supabase 超时
  async getInventoryWithImages(onProgress) {
    if (isSupabaseEnabled) {
      // 第一步：获取所有产品元数据（不含图片，很快）
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, category, barcode, original_price, discount_price, stock, created_by, created_by_role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取库存失败:', error);
        return [];
      }

      // 第二步：分批获取图片（每批5个，避免超时）
      const BATCH_SIZE = 5;
      const results = products.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        barcode: item.barcode,
        originalPrice: item.original_price,
        discountPrice: item.discount_price,
        stock: item.stock,
        image: null,
        createdBy: item.created_by,
        createdByRole: item.created_by_role,
        createdAt: item.created_at
      }));

      const totalBatches = Math.ceil(results.length / BATCH_SIZE);
      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, results.length);
        const batchIds = results.slice(start, end).map(r => r.id);

        if (onProgress) {
          onProgress(Math.round(((batch + 1) / totalBatches) * 100), end, results.length);
        }

        try {
          const { data: imgData, error: imgError } = await supabase
            .from('products')
            .select('id, image')
            .in('id', batchIds);

          if (!imgError && imgData) {
            const imgMap = new Map(imgData.map(d => [d.id, d.image]));
            for (let i = start; i < end; i++) {
              results[i].image = imgMap.get(results[i].id) || null;
            }
          }
        } catch (batchErr) {
          console.warn(`⚠️ 批次 ${batch + 1}/${totalBatches} 图片获取失败:`, batchErr);
        }
      }

      return results;
    }
    return [];
  },

  // 获取单个产品图片（懒加载用）
  async getProductImage(productId) {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase
        .from('products')
        .select('image')
        .eq('id', productId)
        .single();

      if (error) return null;
      return data?.image || null;
    }
    return null;
  },

  // 批量压缩所有产品图片（管理员工具）
  // 逐个获取图片 → canvas 压缩 → 写回数据库
  async compressAllImages(onProgress) {
    if (!isSupabaseEnabled) return { total: 0, compressed: 0, skipped: 0, failed: 0 };

    // 第一步：获取所有产品 ID
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name')
      .order('created_at', { ascending: false });

    if (error || !products) {
      console.error('获取产品列表失败:', error);
      return { total: 0, compressed: 0, skipped: 0, failed: 0 };
    }

    const MAX_SIZE = 600;   // 最大边长 600px（极致压缩）
    const QUALITY = 0.5;    // JPEG 质量 50%
    const SIZE_THRESHOLD = 100 * 1024; // 小于 100KB 的跳过（已经够小了）

    let compressed = 0, skipped = 0, failed = 0;
    const total = products.length;

    // 客户端 canvas 压缩函数
    const compressDataUri = (dataUri) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            } else {
              width = Math.round(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', QUALITY));
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = dataUri;
      });
    };

    // 第二步：逐个处理
    for (let i = 0; i < total; i++) {
      const product = products[i];
      if (onProgress) {
        onProgress(i + 1, total, product.name, { compressed, skipped, failed });
      }

      try {
        // 获取单张图片
        const { data: imgData, error: imgErr } = await supabase
          .from('products')
          .select('image')
          .eq('id', product.id)
          .single();

        if (imgErr || !imgData?.image) {
          skipped++;
          continue;
        }

        const originalImage = imgData.image;

        // 检查是否已经足够小
        const originalSizeBytes = Math.round(originalImage.length * 3 / 4);
        if (originalSizeBytes < SIZE_THRESHOLD) {
          skipped++;
          continue;
        }

        // 压缩
        const compressedImage = await compressDataUri(originalImage);

        // 只有确实变小了才更新
        if (compressedImage.length < originalImage.length) {
          const { error: updateErr } = await supabase
            .from('products')
            .update({ image: compressedImage })
            .eq('id', product.id);

          if (updateErr) {
            console.warn(`⚠️ 更新 ${product.name} 失败:`, updateErr);
            failed++;
          } else {
            const savedKB = Math.round((originalImage.length - compressedImage.length) * 3 / 4 / 1024);
            console.log(`✅ ${product.name}: 节省 ${savedKB}KB`);
            compressed++;
          }
        } else {
          skipped++;
        }
      } catch (err) {
        console.warn(`❌ 处理 ${product.name} 失败:`, err);
        failed++;
      }
    }

    return { total, compressed, skipped, failed };
  },

  async updateStock(id, stock) {
    if (isSupabaseEnabled) {
      const { error } = await supabase
        .from('products')
        .update({ stock })
        .eq('id', id);
      if (error) console.error('更新库存失败:', error);
    }
  },

  async deleteProducts(ids) {
    if (isSupabaseEnabled) {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);
      if (error) console.error('Error al eliminar:', error);
    }
  },

  async updatePrice(id, originalPrice, discountPrice) {
    if (isSupabaseEnabled) {
      const { error } = await supabase
        .from('products')
        .update({
          original_price: originalPrice,
          discount_price: discountPrice
        })
        .eq('id', id);
      if (error) console.error('Error al actualizar precio:', error);
    }
  }
};

// ==================== localStorage 数据层 ====================
const initialData = loadFromStorage();

const localStore = {
  product: initialData.product,
  inventory: initialData.inventory,
  currentUser: initialData.currentUser,

  setCurrentUser(user) {
    this.currentUser = user;
    saveToStorage({ product: this.product, inventory: this.inventory, currentUser: this.currentUser });
  },

  loadCurrentUser() {
    return this.currentUser;
  },

  setProduct(product) {
    this.product = product;
    saveToStorage({ product: this.product, inventory: this.inventory, currentUser: this.currentUser });
  },

  addInventory(item) {
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      createdBy: this.currentUser?.username || 'unknown',
      createdByRole: this.currentUser?.role || 'EMPLOYEE',
      createdAt: new Date().toISOString()
    };
    this.inventory.push(newItem);
    this.product = null;
    saveToStorage({ product: null, inventory: this.inventory, currentUser: this.currentUser });
    return newItem;
  },

  getInventory() {
    return this.inventory;
  },

  getMyInventory(username) {
    return this.inventory.filter(item => item.createdBy === username);
  },

  updateStock(id, stock) {
    const idx = this.inventory.findIndex(item => item.id === id);
    if (idx !== -1) {
      this.inventory[idx].stock = parseInt(stock) || 0;
      saveToStorage({ product: this.product, inventory: this.inventory, currentUser: this.currentUser });
    }
  },

  deleteProducts(ids) {
    this.inventory = this.inventory.filter(item => !ids.includes(item.id));
    saveToStorage({ product: this.product, inventory: this.inventory, currentUser: this.currentUser });
  },

  updatePrice(id, originalPrice, discountPrice) {
    const idx = this.inventory.findIndex(item => item.id === id);
    if (idx !== -1) {
      this.inventory[idx].originalPrice = parseFloat(originalPrice) || 0;
      this.inventory[idx].discountPrice = parseFloat(discountPrice) || 0;
      saveToStorage({ product: this.product, inventory: this.inventory, currentUser: this.currentUser });
    }
  }
};

// ==================== 导出统一接口 ====================
export const store = isSupabaseEnabled ? supabaseStore : localStore;

// 初始化时加载用户
store.loadCurrentUser();