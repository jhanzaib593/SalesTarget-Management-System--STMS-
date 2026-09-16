'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../../lib/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Tags,
  Package,
  Plus,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  FolderPlus,
} from 'lucide-react';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSalesOps = user?.role?.name === 'SALES_OPERATIONS' || user?.role?.name === 'SUPER_ADMIN';

  // Modals state
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Active items for modals
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Form states
  const [brandForm, setBrandForm] = useState({ id: '', code: '', name: '', description: '', color: '#3b82f6' });
  const [categoryForm, setCategoryForm] = useState({ id: '', brandId: '', code: '', name: '' });
  const [productForm, setProductForm] = useState({ id: '', categoryId: '', code: '', name: '', sku: '', unit: 'CTN' });

  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Brands Catalog
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands', 'catalog'],
    queryFn: () => ApiClient.getBrands(),
  });

  // Brand Mutations
  const brandMutation = useMutation({
    mutationFn: async () => {
      if (!brandForm.name.trim()) throw new Error('Brand name is required');
      if (!brandForm.code.trim()) throw new Error('Brand code is required');

      if (brandForm.id) {
        return ApiClient.updateBrand(brandForm.id, {
          name: brandForm.name,
          description: brandForm.description,
          color: brandForm.color,
        });
      } else {
        return ApiClient.createBrand({
          code: brandForm.code,
          name: brandForm.name,
          description: brandForm.description,
          color: brandForm.color,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsBrandModalOpen(false);
      setToastMessage(brandForm.id ? 'Brand updated successfully!' : 'New brand created!');
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => setModalError(err.message || 'Operation failed'),
  });

  // Category Mutations
  const categoryMutation = useMutation({
    mutationFn: async () => {
      if (!categoryForm.name.trim()) throw new Error('Category name is required');
      if (!categoryForm.code.trim()) throw new Error('Category code is required');
      if (!selectedBrandId) throw new Error('Brand selection is required');

      if (categoryForm.id) {
        return ApiClient.updateCategory(categoryForm.id, { name: categoryForm.name });
      } else {
        return ApiClient.createCategory(selectedBrandId, {
          code: categoryForm.code,
          name: categoryForm.name,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsCategoryModalOpen(false);
      setToastMessage('Category saved successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => setModalError(err.message || 'Operation failed'),
  });

  // Product / SKU Mutations
  const productMutation = useMutation({
    mutationFn: async () => {
      if (!productForm.name.trim()) throw new Error('Product name is required');
      if (!productForm.code.trim()) throw new Error('SKU / Product code is required');
      if (!selectedCategoryId) throw new Error('Category selection is required');

      if (productForm.id) {
        return ApiClient.updateProduct(productForm.id, {
          name: productForm.name,
          sku: productForm.sku || productForm.code,
          unit: productForm.unit,
        });
      } else {
        return ApiClient.createProduct(selectedCategoryId, {
          code: productForm.code,
          name: productForm.name,
          sku: productForm.sku || productForm.code,
          unit: productForm.unit,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsProductModalOpen(false);
      setToastMessage('SKU / Product added to catalog!');
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => setModalError(err.message || 'Operation failed'),
  });

  // Delete Mutations
  const deleteBrandMutation = useMutation({
    mutationFn: (id: string) => ApiClient.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setToastMessage('Brand removed from active catalog');
      setTimeout(() => setToastMessage(null), 4000);
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              FMCG Master Catalog
            </span>
            <span className="text-xs text-slate-400">• {brands.length} Active Brands</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Brand Categories & SKUs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Master brand profiles, category groupings, and SKU packaging specifications for volume quotas.
          </p>
        </div>

        {isSalesOps && (
          <button
            onClick={() => {
              setBrandForm({
                id: '',
                code: `BRD-${String.fromCharCode(65 + (brands.length % 26))}`,
                name: '',
                description: '',
                color: '#6366f1',
              });
              setModalError(null);
              setIsBrandModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Brand</span>
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Brand Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading master catalog...
        </div>
      ) : brands.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500">
          No brands found. Click "Add New Brand" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {brands.map((b: any) => (
            <div key={b.id} className="glass-card rounded-xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-white/20"
                    style={{ backgroundColor: b.color || '#3b82f6' }}
                  />
                  <div>
                    <h3 className="text-base font-bold text-white">{b.name}</h3>
                    <span className="text-xs font-mono text-indigo-400 font-semibold">{b.code}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  {isSalesOps && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setBrandForm({
                            id: b.id,
                            code: b.code,
                            name: b.name,
                            description: b.description || '',
                            color: b.color || '#3b82f6',
                          });
                          setModalError(null);
                          setIsBrandModalOpen(true);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                        title="Edit Brand"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove brand ${b.name}?`)) {
                            deleteBrandMutation.mutate(b.id);
                          }
                        }}
                        className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete Brand"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400">{b.description || 'Standard FMCG consumer products line'}</p>

              {/* Categories & Products Section */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Categories & SKUs ({(b.categories || []).length})
                  </span>
                  {isSalesOps && (
                    <button
                      onClick={() => {
                        setSelectedBrandId(b.id);
                        setCategoryForm({
                          id: '',
                          brandId: b.id,
                          code: `CAT-${b.code}-${(b.categories?.length || 0) + 1}`,
                          name: '',
                        });
                        setModalError(null);
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Category
                    </button>
                  )}
                </div>

                {(b.categories || []).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No categories defined under this brand.</p>
                ) : (
                  (b.categories || []).map((cat: any) => (
                    <div key={cat.id} className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-xs">{cat.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {cat.code}
                          </span>
                        </div>

                        {isSalesOps && (
                          <button
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setProductForm({
                                id: '',
                                categoryId: cat.id,
                                code: `SKU-${cat.code}-${(cat.products?.length || 0) + 1}`,
                                name: '',
                                sku: '',
                                unit: 'CTN',
                              });
                              setModalError(null);
                              setIsProductModalOpen(true);
                            }}
                            className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add SKU
                          </button>
                        )}
                      </div>

                      {/* Products / SKUs list */}
                      <div className="space-y-1 pl-2 border-l border-slate-700/60">
                        {(cat.products || []).length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">No SKUs added yet.</p>
                        ) : (
                          (cat.products || []).map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between text-[11px] text-slate-300">
                              <span>• {p.name}</span>
                              <span className="font-mono text-indigo-300 text-[10px] px-1.5 py-0.2 bg-slate-800 rounded">
                                {p.unit}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {brandForm.id ? 'Edit Brand' : 'Create New Brand'}
              </h3>
              <button onClick={() => setIsBrandModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Code *</label>
                <input
                  type="text"
                  value={brandForm.code}
                  disabled={!!brandForm.id}
                  onChange={(e) => setBrandForm({ ...brandForm, code: e.target.value })}
                  placeholder="e.g. BRD-E"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 disabled:opacity-50 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Name *</label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="e.g. Brand E - Prime Juice"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  placeholder="e.g. 100% natural fruit juices line"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Accent Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandForm.color}
                    onChange={(e) => setBrandForm({ ...brandForm, color: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandForm.color}
                    onChange={(e) => setBrandForm({ ...brandForm, color: e.target.value })}
                    className="w-32 h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => brandMutation.mutate()}
                disabled={brandMutation.isPending}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-glow"
              >
                {brandMutation.isPending ? 'Saving...' : brandForm.id ? 'Save Changes' : 'Create Brand'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category Code *</label>
                <input
                  type="text"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                  placeholder="e.g. CAT-BRD-E-01"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. 1-Litre Family Packs"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => categoryMutation.mutate()}
                disabled={categoryMutation.isPending}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-glow"
              >
                {categoryMutation.isPending ? 'Saving...' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product / SKU Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add SKU / Product</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">SKU / Code *</label>
                <input
                  type="text"
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  placeholder="e.g. SKU-JUICE-1L-12X"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Prime Orange Juice 1L Carton 12x"
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Packaging Unit</label>
                <select
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="CTN">CTN (Cartons)</option>
                  <option value="BOX">BOX (Boxes)</option>
                  <option value="DZ">DZ (Dozens)</option>
                  <option value="PC">PC (Pieces / Units)</option>
                  <option value="KG">KG (Kilograms)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => productMutation.mutate()}
                disabled={productMutation.isPending}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-glow"
              >
                {productMutation.isPending ? 'Saving...' : 'Add SKU'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
