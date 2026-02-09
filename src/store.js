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
  async getInventoryWithImages() {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取库存(含图片)失败:', error);
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
        image: item.image,
        createdBy: item.created_by,
        createdByRole: item.created_by_role,
        createdAt: item.created_at
      }));
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