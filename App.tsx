import React, { useState, useEffect, useRef } from 'react';
import { Category, Product, Shop, User } from './types';
import { CategorySection } from './components/CategorySection';
import { suggestProductDetails } from './services/geminiService';
import { supabase } from './lib/supabase';
import { 
  LayoutGrid, 
  Plus, 
  X, 
  Sparkles, 
  Upload, 
  Loader2,
  PackageOpen,
  Check,
  Search,
  Home,
  BarChart3,
  Wallet,
  Package,
  ArrowUpRight,
  Store,
  LogOut,
  Building2,
  ChevronRight,
  Mail,
  Lock,
  User as UserIcon,
  Camera,
  Image as ImageIcon,
  Trash2,
  Download,
  Filter,
  AlertTriangle
} from 'lucide-react';

// Predefined colors
const COLORS = [
  { value: '#6366f1', label: 'نيلي' },
  { value: '#ef4444', label: 'أحمر' },
  { value: '#f97316', label: 'برتقالي' },
  { value: '#f59e0b', label: 'ذهبي' },
  { value: '#10b981', label: 'أخضر' },
  { value: '#06b6d4', label: 'سماوي' },
  { value: '#3b82f6', label: 'أزرق' },
  { value: '#8b5cf6', label: 'بنفسجي' },
  { value: '#ec4899', label: 'وردي' },
  { value: '#64748b', label: 'رمادي' },
];

const App: React.FC = () => {
  // --- Auth & Shop State ---
  const [user, setUser] = useState<User | null>(null);
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // --- Auth Form State ---
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');

  // --- Inventory State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // --- UI State ---
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // --- Form State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [newShopName, setNewShopName] = useState('');
  const [newShopColor, setNewShopColor] = useState(COLORS[0].value);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLORS[0].value);

  const [newProductName, setNewProductName] = useState('');
  const [newProductQty, setNewProductQty] = useState(1);
  const [newProductPrice, setNewProductPrice] = useState<number>(0);
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [newProductDesc, setNewProductDesc] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- Refs for File Inputs ---
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || session.user.email!.split('@')[0],
          photoUrl: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`
        });
        fetchShops(session.user.id);
      }
      setIsAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || session.user.email!.split('@')[0],
          photoUrl: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`
        });
        fetchShops(session.user.id);
      } else {
        setUser(null);
        setShops([]);
        setActiveShop(null);
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Database Fetching ---

  const fetchShops = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedShops: Shop[] = data.map(s => ({
            id: s.id,
            ownerId: s.owner_id,
            name: s.name,
            color: s.color,
            createdAt: new Date(s.created_at).getTime()
        }));
        setShops(mappedShops);
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
    }
  };

  const fetchShopData = async (shopId: string) => {
    setIsDataLoading(true);
    try {
        // Fetch Categories
        const { data: catData, error: catError } = await supabase
            .from('categories')
            .select('*')
            .eq('shop_id', shopId);

        if (catError) throw catError;

        if (catData) {
            setCategories(catData.map(c => ({
                id: c.id,
                shopId: c.shop_id,
                name: c.name,
                color: c.color
            })));
        }

        // Fetch Products
        const { data: prodData, error: prodError } = await supabase
            .from('products')
            .select('*')
            .eq('shop_id', shopId);

        if (prodError) throw prodError;

        if (prodData) {
            setProducts(prodData.map(p => ({
                id: p.id,
                shopId: p.shop_id,
                categoryId: p.category_id,
                name: p.name,
                quantity: p.quantity,
                price: p.price,
                image: p.image,
                description: p.description,
                lastUpdated: new Date(p.last_updated).getTime()
            })));
        }

    } catch (err) {
        console.error("Error fetching data:", err);
    } finally {
        setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (activeShop) {
        fetchShopData(activeShop.id);
    }
  }, [activeShop]);

  // --- Auth Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        // Profile creation is handled by trigger usually, or we can just rely on auth metadata for this simple app
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'حدث خطأ أثناء المصادقة');
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Shop Handlers ---
  const handleCreateShop = async () => {
    if (!newShopName.trim() || !user) return;
    
    try {
        const { data, error } = await supabase
            .from('shops')
            .insert([{
                owner_id: user.id,
                name: newShopName,
                color: newShopColor
            }])
            .select()
            .single();

        if (error) throw error;

        if (data) {
            const newShop: Shop = {
                id: data.id,
                ownerId: data.owner_id,
                name: data.name,
                color: data.color,
                createdAt: new Date(data.created_at).getTime()
            };
            setShops([newShop, ...shops]);
            setNewShopName('');
            setShowCreateShopModal(false);
            setActiveShop(newShop);
        }
    } catch (err) {
        console.error(err);
        alert('فشل إنشاء المحل');
    }
  };

  // --- Category Handlers ---
  const handleSaveCategory = async () => {
    if (!newCategoryName.trim() || !activeShop) return;

    try {
        if (editingCategory) {
            const { error } = await supabase
                .from('categories')
                .update({ name: newCategoryName, color: newCategoryColor })
                .eq('id', editingCategory.id);
            
            if (error) throw error;

            setCategories(categories.map(c => c.id === editingCategory.id ? {
                ...c,
                name: newCategoryName,
                color: newCategoryColor
            } : c));
        } else {
            const { data, error } = await supabase
                .from('categories')
                .insert([{
                    shop_id: activeShop.id,
                    name: newCategoryName,
                    color: newCategoryColor
                }])
                .select()
                .single();
            
            if (error) throw error;

            if (data) {
                setCategories([...categories, {
                    id: data.id,
                    shopId: data.shop_id,
                    name: data.name,
                    color: data.color
                }]);
            }
        }
        closeCategoryModal();
    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if(confirm('سيتم حذف القسم وجميع المنتجات داخله. هل أنت متأكد؟')) {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);
            
            if (error) throw error;

            setCategories(categories.filter(c => c.id !== id));
            setProducts(products.filter(p => p.categoryId !== id));
        } catch (err) {
            console.error(err);
            alert('فشل الحذف');
        }
    }
  };

  // --- Product Handlers ---
  const handleAiSuggest = async () => {
    if (!newProductName.trim()) return;
    setIsAiLoading(true);
    const existingNames = categories.map(c => c.name);
    
    const prediction = await suggestProductDetails(newProductName, existingNames);
    
    if (prediction) {
      setNewProductDesc(prediction.shortDescription);
      const foundCategory = categories.find(c => c.name === prediction.suggestedCategory);
      if (foundCategory) {
        setSelectedCategoryId(foundCategory.id);
      }
    }
    setIsAiLoading(false);
  };

  const handleSaveProduct = async () => {
    if (!newProductName.trim() || !selectedCategoryId || !activeShop) return;
    
    try {
        const payload = {
            shop_id: activeShop.id,
            category_id: selectedCategoryId,
            name: newProductName,
            quantity: newProductQty,
            price: newProductPrice,
            image: newProductImage, // Note: Storing base64 in text column (Not recommended for prod, but okay for MVP)
            description: newProductDesc,
            last_updated: new Date().toISOString()
        };

        if (editingProduct) {
            const { error } = await supabase
                .from('products')
                .update(payload)
                .eq('id', editingProduct.id);

            if (error) throw error;

            setProducts(products.map(p => p.id === editingProduct.id ? {
                ...p,
                categoryId: selectedCategoryId,
                name: newProductName,
                quantity: newProductQty,
                price: newProductPrice,
                image: newProductImage,
                description: newProductDesc,
                lastUpdated: Date.now()
            } : p));
        } else {
            const { data, error } = await supabase
                .from('products')
                .insert([payload])
                .select()
                .single();
            
            if (error) throw error;

            if (data) {
                setProducts([...products, {
                    id: data.id,
                    shopId: data.shop_id,
                    categoryId: data.category_id,
                    name: data.name,
                    quantity: data.quantity,
                    price: data.price,
                    image: data.image,
                    description: data.description,
                    lastUpdated: Date.now()
                }]);
            }
        }
        closeProductModal();
    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء حفظ المنتج');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProductName(product.name);
    setNewProductQty(product.quantity);
    setNewProductPrice(product.price || 0);
    setNewProductImage(product.image);
    setNewProductDesc(product.description || '');
    setSelectedCategoryId(product.categoryId);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
            alert('فشل الحذف');
        }
    }
  };

  const handleUpdateQuantity = async (id: string, qty: number) => {
    try {
        // Optimistic update
        setProducts(products.map(p => p.id === id ? { ...p, quantity: qty, lastUpdated: Date.now() } : p));
        
        const { error } = await supabase
            .from('products')
            .update({ quantity: qty, last_updated: new Date().toISOString() })
            .eq('id', id);
        
        if (error) {
            // Revert if error (fetching fresh data usually better, but keeping simple)
            throw error;
        }
    } catch (err) {
        console.error(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit
        alert('الصورة كبيرة جداً. يرجى اختيار صورة أقل من 2 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  // --- Export Handler ---
  const handleExportCSV = () => {
    if (!activeShop || products.length === 0) return;

    // Define CSV Headers
    const headers = ['اسم المنتج', 'القسم', 'الكمية', 'السعر', 'الوصف'];
    
    // Map data
    const rows = products.map(product => {
      const categoryName = categories.find(c => c.id === product.categoryId)?.name || 'غير مصنف';
      // Escape quotes for CSV
      const escapedName = `"${product.name.replace(/"/g, '""')}"`;
      const escapedDesc = `"${(product.description || '').replace(/"/g, '""')}"`;
      
      return [
        escapedName,
        `"${categoryName}"`,
        product.quantity,
        product.price,
        escapedDesc
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Add BOM for Excel Arabic support
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_${activeShop.name}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Helper to open/close modals ---
  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor(COLORS[0].value);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color || COLORS[0].value);
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => setShowCategoryModal(false);

  const openAddProductModal = (catId: string) => {
    setNewProductName('');
    setNewProductQty(1);
    setNewProductPrice(0);
    setNewProductImage(null);
    setNewProductDesc('');
    setEditingProduct(null);
    setSelectedCategoryId(catId);
    setShowAddProductModal(true);
  };

  const closeProductModal = () => setShowAddProductModal(false);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = showLowStockOnly ? p.quantity <= 3 : true;
    return matchesSearch && matchesLowStock;
  });

  const totalInventoryValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const totalProductsCount = products.reduce((acc, p) => acc + p.quantity, 0);
  const lowStockCount = products.filter(p => p.quantity <= 3).length;

  // ================= RENDER LOGIC =================

  // 0. Global Loading
  if (isAuthLoading) {
     return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary" size={40}/></div>;
  }

  // 1. Auth Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-500">
           <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <PackageOpen size={40} className="text-primary" />
           </div>
           
           <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
             {authMode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
           </h1>
           <p className="text-slate-500 text-center mb-8 text-sm">إدارة مخزون احترافية وسهلة</p>

           <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                 <div className="relative">
                    <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="الاسم الكامل"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                 </div>
              )}
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              {authError && <p className="text-red-500 text-xs text-center font-medium">{authError}</p>}

              <button 
                type="submit"
                className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-600 transition-colors"
              >
                {authMode === 'signin' ? 'دخول' : 'تسجيل'}
              </button>
           </form>

           <div className="text-center mt-6">
             <button 
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="text-primary text-sm font-bold hover:underline"
             >
                {authMode === 'signin' ? 'لا تملك حساباً؟ أنشئ حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
             </button>
           </div>
        </div>
      </div>
    );
  }

  // 2. Shop Selection Screen
  if (!activeShop) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
           {/* Header */}
           <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                 <img src={user.photoUrl} alt={user.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                 <div>
                    <h1 className="text-xl font-bold text-slate-900">مرحباً، {user.name}</h1>
                    <p className="text-sm text-slate-500">اختر محلاً لإدارة مخزونه</p>
                 </div>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm">
                 <LogOut size={20} />
              </button>
           </div>

           {/* Shops Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Add New Shop Card */}
              <button 
                onClick={() => setShowCreateShopModal(true)}
                className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary hover:bg-indigo-50/30 transition-all group h-64"
              >
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                    <Plus size={32} />
                 </div>
                 <span className="font-bold text-lg">إضافة محل جديد</span>
              </button>

              {/* Existing Shops */}
              {shops.map(shop => (
                 <div 
                   key={shop.id} 
                   onClick={() => setActiveShop(shop)}
                   className="bg-white rounded-3xl shadow-soft hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer overflow-hidden relative group h-64 flex flex-col"
                 >
                    <div className="h-2 bg-gradient-to-r from-transparent via-white/30 to-transparent absolute top-0 w-full z-10 opacity-30"></div>
                    <div className="p-6 flex-1 flex flex-col">
                       <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-auto shadow-lg" style={{ backgroundColor: shop.color }}>
                          <Store size={24} />
                       </div>
                       <div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-1">{shop.name}</h3>
                          <p className="text-xs text-slate-400">
                             تم الإنشاء: {new Date(shop.createdAt).toLocaleDateString('ar-EG')}
                          </p>
                       </div>
                    </div>
                    <div className="bg-slate-50 p-4 flex justify-between items-center border-t border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                       <span className="text-xs font-bold text-slate-400 group-hover:text-primary">دخول للمخزن</span>
                       <ChevronRight size={16} className="text-slate-300 group-hover:text-primary group-hover:translate-x-[-4px] transition-all"/>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Create Shop Modal */}
        {showCreateShopModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
             <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                <h2 className="text-2xl font-bold mb-6">إضافة محل جديد</h2>
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">اسم المحل</label>
                      <input 
                        type="text"
                        value={newShopName}
                        onChange={(e) => setNewShopName(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-lg"
                        placeholder="سوبر ماركت الهدى..."
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">لون مميز</label>
                      <div className="flex flex-wrap gap-3">
                         {COLORS.slice(0, 5).map(c => (
                            <button 
                              key={c.value}
                              onClick={() => setNewShopColor(c.value)}
                              className={`w-10 h-10 rounded-full transition-all ${newShopColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                              style={{ backgroundColor: c.value }}
                            />
                         ))}
                      </div>
                   </div>
                   <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowCreateShopModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">إلغاء</button>
                      <button onClick={handleCreateShop} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-indigo-600 shadow-lg shadow-indigo-200">إنشاء</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Inventory Dashboard
  return (
    <div className="min-h-screen font-sans text-slate-800 pb-24 md:pb-10 bg-[#f8fafc]">
      
      {/* Desktop Header */}
      <nav className="hidden md:block sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
               onClick={() => { setActiveShop(null); setProducts([]); setCategories([]); }}
               className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
               title="الرجوع للمحلات"
            >
               <ArrowUpRight size={20} className="rotate-45" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl text-white shadow-lg" style={{ backgroundColor: activeShop.color }}>
                <Store size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-none">{activeShop.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-slate-500 font-medium">لوحة التحكم بالمخزون</span>
                     {isDataLoading && <Loader2 size={12} className="animate-spin text-primary"/>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-8 flex gap-3">
             <div className="relative group flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                   type="text"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                   placeholder="بحث داخل هذا المحل..."
                />
             </div>
             
             {/* Filter Low Stock Button */}
             <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex items-center gap-2 px-4 rounded-2xl font-bold text-sm transition-all border ${
                    showLowStockOnly 
                    ? 'bg-red-50 text-red-600 border-red-200' 
                    : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                }`}
                title="عرض النواقص فقط"
             >
                <AlertTriangle size={18} />
                <span className="hidden lg:inline">النواقص</span>
             </button>

             {/* Export CSV Button */}
             <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 rounded-2xl bg-white text-slate-600 font-bold text-sm border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                title="تصدير لملف Excel"
             >
                <Download size={18} />
                <span className="hidden lg:inline">تصدير</span>
             </button>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={openAddCategoryModal}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 text-sm font-bold shadow-xl shadow-slate-900/20"
            >
              <Plus size={20} />
              <span>قسم جديد</span>
            </button>
             <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                <img src={user.photoUrl} alt="User" />
             </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 py-4 border-b border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-2">
              <button onClick={() => { setActiveShop(null); setProducts([]); setCategories([]); }} className="p-1 text-slate-400"><ArrowUpRight className="rotate-45" size={20}/></button>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: activeShop.color }}>
                 <Store size={18}/>
              </div>
              <span className="font-bold text-lg truncate max-w-[150px]">{activeShop.name}</span>
           </div>
           
           <div className="flex gap-2">
             <button 
                onClick={handleExportCSV}
                className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600"
             >
                <Download size={20} />
             </button>
             <button 
                onClick={openAddCategoryModal} 
                className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg"
             >
                <Plus size={24} />
             </button>
           </div>
        </div>
        <div className="flex gap-2">
            <div className="relative flex-1">
                 <Search className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                 <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl py-3 pr-10 pl-4 text-sm focus:ring-2 focus:ring-primary/20"
                    placeholder="بحث..."
                  />
            </div>
            <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`w-12 flex items-center justify-center rounded-xl transition-colors ${
                    showLowStockOnly ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
                }`}
            >
                <AlertTriangle size={20} />
            </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Low Stock Alert Banner */}
        {lowStockCount > 0 && !showLowStockOnly && (
           <div 
             onClick={() => setShowLowStockOnly(true)}
             className="mb-8 bg-red-50 border border-red-200 rounded-3xl p-5 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-all shadow-sm group"
           >
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner group-hover:scale-110 transition-transform">
                   <AlertTriangle size={24} />
                </div>
                <div>
                   <h3 className="font-bold text-red-900 text-lg mb-1">تنبيه: مخزون منخفض</h3>
                   <p className="text-red-700/80 text-sm font-medium">يوجد {lowStockCount} منتجات وصلت للحد الأدنى للمخزون (3 قطع أو أقل).</p>
                </div>
             </div>
             <div className="hidden md:flex items-center gap-2 text-red-700 font-bold bg-white/60 px-5 py-3 rounded-xl group-hover:bg-white transition-colors shadow-sm">
                <span>عرض المنتجات</span>
                <ChevronRight size={18} className="rotate-180" /> 
             </div>
           </div>
        )}
        
        {/* Stats Overview */}
        {categories.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="flex justify-between items-start z-10">
                   <span className="text-slate-500 text-sm font-medium">قيمة المحل</span>
                   <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Wallet size={18}/></div>
                </div>
                <div className="z-10">
                   <h3 className="text-2xl font-bold text-slate-800">{totalInventoryValue.toLocaleString()}</h3>
                   <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">العملة المحلية</span>
                </div>
             </div>

             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="flex justify-between items-start z-10">
                   <span className="text-slate-500 text-sm font-medium">عدد البضائع</span>
                   <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Package size={18}/></div>
                </div>
                <div className="z-10">
                   <h3 className="text-2xl font-bold text-slate-800">{totalProductsCount}</h3>
                   <span className="text-xs text-emerald-500 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">قطعة</span>
                </div>
             </div>
             
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 md:col-span-2 relative overflow-hidden bg-slate-900 text-white" style={{ background: `linear-gradient(to bottom right, ${activeShop.color}, #1e293b)` }}>
                <div className="flex justify-between items-start z-10">
                   <span className="text-white/80 text-sm font-medium">الأقسام</span>
                   <div className="bg-white/20 p-2 rounded-lg text-white"><LayoutGrid size={18}/></div>
                </div>
                <div className="z-10 flex justify-between items-end">
                   <div>
                     <h3 className="text-3xl font-bold">{categories.length}</h3>
                   </div>
                   <button onClick={openAddCategoryModal} className="text-xs bg-white text-slate-900 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center gap-1">
                      إضافة جديد <ArrowUpRight size={12}/>
                   </button>
                </div>
             </div>
          </div>
        )}

        {isDataLoading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-soft text-center px-4">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <LayoutGrid size={40} className="text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">المحل فارغ حالياً</h3>
            <p className="text-slate-500 mb-8 max-w-md leading-relaxed">
              ابدأ بإضافة الأقسام (مثل: مشروبات، معلبات) لتنظيم البضاعة داخل المحل.
            </p>
            <button 
              onClick={openAddCategoryModal}
              className="px-8 py-4 bg-primary text-white rounded-2xl hover:bg-indigo-600 transition-all hover:shadow-lg font-bold text-lg flex items-center gap-2"
            >
              <Plus size={24} />
              <span>إضافة أول قسم</span>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map(category => {
              const categoryProducts = filteredProducts.filter(p => p.categoryId === category.id);
              // If filtering by Low Stock, we hide categories that have no low stock items even if search matches
              if (categoryProducts.length === 0) return null;

              return (
                <CategorySection 
                  key={category.id} 
                  category={category}
                  products={categoryProducts}
                  onAddProduct={openAddProductModal}
                  onEditProduct={handleEditProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onUpdateProductQuantity={handleUpdateQuantity}
                  onDeleteCategory={handleDeleteCategory}
                  onEditCategory={openEditCategoryModal}
                />
              );
            })}
             {filteredProducts.length === 0 && (
               <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                     <Search size={32} className="opacity-50"/>
                  </div>
                  <p className="font-medium text-lg">لا توجد نتائج مطابقة</p>
                  {showLowStockOnly && <p className="text-sm mt-2">جرب إيقاف فلتر "النواقص" لعرض كل المنتجات</p>}
               </div>
            )}
          </div>
        )}
      </main>

      {/* --- Modals (Category & Product) --- */}
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">{editingCategory ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
              <button onClick={closeCategoryModal} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم القسم</label>
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="مثلاً: حلويات" 
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">لون للتميز</label>
                <div className="grid grid-cols-5 gap-4">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewCategoryColor(color.value)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${newCategoryColor === color.value ? 'ring-4 ring-offset-2 ring-slate-300 scale-110 shadow-lg' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: color.value }}
                    >
                      {newCategoryColor === color.value && <Check size={20} className="text-white drop-shadow-md" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={handleSaveCategory}
                className="w-full text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg mt-4"
                style={{ backgroundColor: newCategoryColor }}
              >
                {editingCategory ? 'حفظ التعديلات' : 'إنشاء القسم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-xl p-6 md:p-8 shadow-2xl h-[90vh] md:h-auto overflow-y-auto animate-in slide-in-from-bottom-10 md:zoom-in duration-300">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-slate-50">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج'}
              </h2>
              <button onClick={closeProductModal} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنتج</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="اسم المنتج..." 
                    className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                  <button 
                    onClick={handleAiSuggest}
                    disabled={isAiLoading || !newProductName}
                    className="px-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 border-2 border-indigo-100 transition-colors disabled:opacity-50 flex flex-col items-center justify-center min-w-[80px]"
                  >
                    {isAiLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                    <span className="text-[10px] font-bold mt-1">AI</span>
                  </button>
                </div>
                {newProductDesc && (
                    <div className="mt-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                        <Sparkles size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-indigo-700 leading-relaxed">{newProductDesc}</p>
                    </div>
                )}
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">القسم</label>
                 <div className="relative">
                    <select 
                        value={selectedCategoryId || ''}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ArrowUpRight size={16} className="rotate-45" />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الكمية</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newProductQty}
                      onChange={(e) => setNewProductQty(Number(e.target.value))}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-mono font-medium text-lg text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">السعر</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-mono font-medium text-lg text-center"
                    />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">صورة المنتج</label>
                <div className="mt-1 p-4 border-2 border-slate-200 border-dashed rounded-3xl bg-slate-50/50">
                    {/* Image Preview */}
                    {newProductImage ? (
                        <div className="relative mb-4 w-full flex justify-center">
                           <div className="relative inline-block">
                             <img src={newProductImage} alt="Preview" className="h-40 w-auto object-contain rounded-xl shadow-sm border border-slate-200" />
                             <button 
                                onClick={() => setNewProductImage(null)}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                                type="button"
                             >
                                <X size={16} />
                             </button>
                           </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                           <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                             <ImageIcon size={32} />
                           </div>
                           <p className="text-sm">لا توجد صورة</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                       <button onClick={() => galleryInputRef.current?.click()} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                          <Upload size={20} className="text-slate-500" /> 
                          <span className="text-sm">معرض الصور</span>
                       </button>
                       <button onClick={() => cameraInputRef.current?.click()} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">
                          <Camera size={20} /> 
                          <span className="text-sm">التقاط صورة</span>
                       </button>
                    </div>

                    {/* Hidden Inputs */}
                    <input 
                        type="file" 
                        ref={galleryInputRef} 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload} 
                    />
                    <input 
                        type="file" 
                        ref={cameraInputRef} 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        onChange={handleImageUpload} 
                    />
                </div>
              </div>
              
              <button 
                onClick={handleSaveProduct}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl"
              >
                {editingProduct ? 'حفظ التعديلات' : 'إضافة للمخزون'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe z-50">
          <div className="flex justify-around items-center h-16">
              <button className="flex flex-col items-center justify-center w-full h-full text-primary">
                  <Home size={24} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold mt-1">الرئيسية</span>
              </button>
              
              <div className="relative -top-5">
                  <button 
                    onClick={openAddCategoryModal}
                    className="w-14 h-14 bg-slate-900 rounded-2xl rotate-45 flex items-center justify-center shadow-lg shadow-slate-900/40 text-white"
                  >
                      <Plus size={28} className="-rotate-45" />
                  </button>
              </div>

              <button onClick={() => setActiveShop(null)} className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                  <Store size={24} />
                  <span className="text-[10px] font-medium mt-1">المحلات</span>
              </button>
          </div>
      </div>
    </div>
  );
};

export default App;