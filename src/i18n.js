// 西班牙语国际化配置
export const i18n = {
    // 通用
    app: {
        title: "Gestión de Almacén",
        loading: "Cargando...",
        save: "Guardar",
        cancel: "Cancelar",
        confirm: "Confirmar",
        delete: "Eliminar",
        edit: "Editar",
        add: "Agregar",
        search: "Buscar",
        filter: "Filtrar",
        export: "Exportar",
        back: "Volver",
        next: "Siguiente",
        yes: "Sí",
        no: "No"
    },

    // 登录
    login: {
        title: "Inicio de Sesión",
        username: "Usuario",
        password: "Contraseña",
        button: "Iniciar Sesión",
        error: "Usuario o contraseña incorrectos",
        enterUsername: "Ingrese su nombre de usuario",
        enterPassword: "Ingrese su contraseña"
    },

    // 导航
    nav: {
        photo: "Entrada",
        barcode: "Código",
        inventory: "Inventario",
        myRecords: "Mis Registros",
        admin: "Admin"
    },

    // 拍照入库
    createProduct: {
        title: "📷 Entrada de Foto",
        step1: "Paso 1: Tomar foto del producto",
        takePhoto: "Toque para tomar foto",
        retake: "🔄 Tomar otra foto",
        analyzing: "AI analizando información del producto...",
        result: "✨ Resultado del Análisis AI",
        stock: "Stock",
        category: "Categoría",
        nextStep: "Siguiente: Ingresar código de barras →",
        startCamera: "📷 Iniciar Cámara",
        capture: "📸 Capturar",
        stopCamera: "Detener Cámara"
    },

    // 条形码
    barcode: {
        title: "📊 Entrada de Código de Barras",
        productInfo: "📦 Información del Producto",
        barcodeSection: "📊 Código de Barras",
        barcodeNumber: "Número de Código",
        scanOrEnter: "Escanear o ingresar código",
        generate: "Generar",
        scan: "📷 Escanear",
        stopScan: "Detener",
        stockSection: "📈 Cantidad de Stock",
        quantity: "Cantidad de entrada",
        confirmEntry: "✅ Confirmar Entrada",
        saving: "Guardando...",
        success: "✅ ¡Entrada exitosa!",
        noProduct: "⚠️ Primero tome una foto en la página de entrada",
        goToPhoto: "Ir a Entrada de Foto"
    },

    // 库存
    inventory: {
        title: "📦 Lista de Inventario",
        searchPlaceholder: "Buscar nombre, código, creador...",
        allCategories: "Todas las categorías",
        sortBy: "Ordenar por",
        sortNewest: "Más reciente",
        sortOldest: "Más antiguo",
        sortNameAsc: "Nombre A-Z",
        sortNameDesc: "Nombre Z-A",
        sortStockAsc: "Stock ↑",
        sortStockDesc: "Stock ↓",
        noItems: "No hay productos en el inventario",
        items: "productos",
        totalStock: "stock total",
        by: "por",
        exportExcel: "📥 Exportar Excel"
    },

    // 我的记录
    myRecords: {
        title: "📋 Mis Registros",
        welcome: "Bienvenido",
        totalRecords: "Total de registros",
        totalQuantity: "Cantidad total",
        noRecords: "Aún no tienes registros de entrada"
    },

    // 管理后台
    admin: {
        title: "Gestión de Almacén",
        dashboard: "Panel de Control",
        inventory: "Inventario",
        employees: "Empleados",
        reports: "Informes",
        settings: "Configuración",
        logout: "Cerrar Sesión"
    },

    // 仪表盘
    dashboard: {
        title: "📊 Panel de Control",
        subtitle: "Vista general de datos del almacén",
        totalProducts: "Total Productos",
        totalStock: "Stock Total",
        totalValue: "Valor Total",
        todayEntry: "Entradas Hoy",
        employeeRanking: "🏆 Ranking de Empleados",
        noData: "Sin datos",
        quickActions: "⚡ Acciones Rápidas",
        manageInventory: "Gestionar Inventario",
        manageEmployees: "Gestionar Empleados",
        viewReports: "Ver Informes"
    },

    // 库存管理
    adminInventory: {
        title: "📦 Gestión de Inventario",
        subtitle: "Administrar todos los productos del almacén",
        totalProducts: "Total",
        totalStock: "Stock",
        lowStock: "Stock Bajo",
        selectAll: "Seleccionar todo",
        deleteSelected: "🗑️ Eliminar seleccionados",
        exportFiltered: "📥 Exportar con Filtros",
        product: "Producto",
        category: "Categoría",
        barcodeCol: "Código de Barras",
        price: "Precio",
        stockCol: "Stock",
        creator: "Creador",
        date: "Fecha",
        actions: "Acciones"
    },

    // 导出筛选
    exportFilter: {
        title: "📥 Exportar con Filtros",
        dateRange: "Rango de Fechas",
        startDate: "Fecha Inicio",
        endDate: "Fecha Fin",
        category: "Categoría",
        employee: "Empleado",
        allCategories: "Todas las categorías",
        allEmployees: "Todos los empleados",
        exportAll: "Exportar Todo",
        exportFiltered: "Exportar Filtrado",
        recordsFound: "registros encontrados"
    },

    // 员工管理
    employees: {
        title: "👥 Gestión de Empleados",
        subtitle: "Administrar usuarios del sistema",
        total: "Total Empleados",
        admins: "Administradores",
        active: "Cuentas Activas",
        addEmployee: "➕ Agregar Empleado",
        username: "Usuario",
        role: "Rol",
        records: "Registros",
        quantity: "Cantidad",
        lastActive: "Última Actividad",
        status: "Estado",
        actions: "Acciones",
        admin: "Administrador",
        employee: "Empleado",
        activeStatus: "Activo",
        disabled: "Deshabilitado",
        cannotDisableAdmin: "No se puede deshabilitar la cuenta de administrador",
        cannotDeleteAdmin: "No se puede eliminar la cuenta de administrador",
        confirmDelete: "¿Está seguro de eliminar al empleado",
        enterUsername: "Ingrese nombre de usuario",
        usernameExists: "El nombre de usuario ya existe"
    },

    // 报表
    reports: {
        title: "📈 Informes y Estadísticas",
        subtitle: "Análisis de datos del almacén",
        inventoryTrends: "📊 Tendencias de Inventario",
        employeePerformance: "👥 Rendimiento de Empleados",
        categoryStats: "📁 Estadísticas por Categoría",
        week: "Semana",
        month: "Mes",
        records: "registros",
        items: "unidades"
    },

    // 设置
    settings: {
        title: "⚙️ Configuración del Sistema",
        subtitle: "Configurar parámetros del sistema",
        discountRate: "Tasa de Descuento Predeterminada",
        discountDesc: "Porcentaje de descuento aplicado a nuevos productos",
        lowStockThreshold: "Umbral de Stock Bajo",
        lowStockDesc: "Cantidad mínima antes de mostrar alerta",
        auditRequired: "Auditoría Obligatoria",
        auditDesc: "Requerir auditoría para todas las entradas nuevas",
        categories: "Categorías de Productos",
        categoriesDesc: "Gestionar categorías disponibles",
        addCategory: "Agregar Categoría",
        newCategory: "Nueva categoría",
        saved: "✅ Configuración guardada"
    },

    // 货币和单位
    units: {
        currency: "$",
        pieces: "uds"
    }
};

export default i18n;
