const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiClient {
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('stms_token');
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorData: any = {};
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { message: res.statusText };
      }
      const message = errorData.message || errorData.error || `HTTP error ${res.status}`;
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    // Return JSON or empty object
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json();
    }
    return {} as T;
  }

  // Auth
  static async login(email: string, pass: string) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    if (res.accessToken && typeof window !== 'undefined') {
      localStorage.setItem('stms_token', res.accessToken);
      localStorage.setItem('stms_user', JSON.stringify(res.user));
    }
    return res;
  }

  static async getMe() {
    return this.request('/auth/me');
  }

  static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stms_token');
      localStorage.removeItem('stms_user');
    }
  }

  // Dashboard
  static async getSalesOpsDashboard() {
    return this.request('/dashboard/sales-operations');
  }

  static async getMyDashboardView() {
    return this.request('/dashboard/my-view');
  }

  // Target Plans
  static async getTargetPlans() {
    return this.request('/target-plans');
  }

  static async getTargetPlan(id: string) {
    return this.request(`/target-plans/${id}`);
  }

  static async createTargetPlan(data: any) {
    return this.request('/target-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async finalizeTargetPlan(id: string) {
    return this.request(`/target-plans/${id}/finalize`, {
      method: 'POST',
    });
  }

  // Allocations
  static async getAllocationWorkbench(employeeId?: string, targetPlanId?: string) {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    if (targetPlanId) params.append('targetPlanId', targetPlanId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/allocations/workbench${query}`);
  }

  static async allocateToChildren(parentAllocationId: string, children: any[]) {
    return this.request(`/allocations/${parentAllocationId}/children`, {
      method: 'POST',
      body: JSON.stringify({ children }),
    });
  }

  static async submitAllocation(allocationId: string, comments?: string) {
    return this.request(`/allocations/${allocationId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  // Approvals
  static async getPendingApprovals() {
    return this.request('/approvals/pending');
  }

  static async approveRequest(id: string, comments?: string) {
    return this.request(`/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  static async rejectRequest(id: string, comments: string) {
    return this.request(`/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  static async requestRevision(id: string, comments: string) {
    return this.request(`/approvals/${id}/request-revision`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  // Reports
  static async getConsolidatedReport(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request(`/reports/consolidated?${query.toString()}`);
  }

  static async getBrandWiseReport(targetPlanId?: string) {
    const q = targetPlanId ? `?targetPlanId=${targetPlanId}` : '';
    return this.request(`/reports/brand-wise${q}`);
  }

  static async getRsmWiseReport(targetPlanId?: string) {
    const q = targetPlanId ? `?targetPlanId=${targetPlanId}` : '';
    return this.request(`/reports/rsm-wise${q}`);
  }

  static async getUnallocatedReport(targetPlanId?: string) {
    const q = targetPlanId ? `?targetPlanId=${targetPlanId}` : '';
    return this.request(`/reports/unallocated${q}`);
  }

  // Organization & Master Data
  static async getRoles() {
    return this.request('/employees/roles');
  }

  static async getEmployees(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request(`/employees?${query.toString()}`);
  }

  static async createEmployee(data: any) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateEmployee(id: string, data: any) {
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteEmployee(id: string) {
    return this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  static async getHierarchyTree(rootId?: string) {
    const q = rootId ? `?rootId=${rootId}` : '';
    return this.request(`/employees/hierarchy${q}`);
  }

  // Brands, Categories, and SKUs
  static async getBrands() {
    return this.request('/brands');
  }

  static async createBrand(data: any) {
    return this.request('/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateBrand(id: string, data: any) {
    return this.request(`/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteBrand(id: string) {
    return this.request(`/brands/${id}`, {
      method: 'DELETE',
    });
  }

  static async createCategory(brandId: string, data: any) {
    return this.request(`/brands/${brandId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCategory(id: string, data: any) {
    return this.request(`/brands/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteCategory(id: string) {
    return this.request(`/brands/categories/${id}`, {
      method: 'DELETE',
    });
  }

  static async createProduct(categoryId: string, data: any) {
    return this.request(`/brands/categories/${categoryId}/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateProduct(id: string, data: any) {
    return this.request(`/brands/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteProduct(id: string) {
    return this.request(`/brands/products/${id}`, {
      method: 'DELETE',
    });
  }

  static async getDivisions() {
    return this.request('/organization/divisions');
  }

  static async getRegions(divisionId?: string) {
    const q = divisionId ? `?divisionId=${divisionId}` : '';
    return this.request(`/organization/regions${q}`);
  }

  static async getTerritories(regionId?: string) {
    const q = regionId ? `?regionId=${regionId}` : '';
    return this.request(`/organization/territories${q}`);
  }

  static async getTargetPeriods() {
    return this.request('/target-periods');
  }

  // Revisions & Versions
  static async getPlanVersions(targetPlanId: string) {
    return this.request(`/revisions/${targetPlanId}/versions`);
  }

  static async createRevision(targetPlanId: string, data: { newTotalTarget: number; reason: string; notes?: string }) {
    return this.request(`/revisions/${targetPlanId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Imports & Exports
  static async validateImport(targetPlanId: string, rows: any[]) {
    return this.request('/imports/validate', {
      method: 'POST',
      body: JSON.stringify({ targetPlanId, rows }),
    });
  }

  static async executeImport(targetPlanId: string, rows: any[]) {
    return this.request('/imports/execute', {
      method: 'POST',
      body: JSON.stringify({ targetPlanId, rows }),
    });
  }

  static getExportUrl(targetPlanId: string) {
    return `${API_BASE}/exports/target/${targetPlanId}`;
  }

  // Integrations & Audit
  static async syncToSecondaryErp(targetPlanId: string) {
    return this.request(`/integrations/sync/${targetPlanId}`, {
      method: 'POST',
    });
  }

  static async getIntegrationLogs() {
    return this.request('/integrations/logs');
  }

  static async getAuditLogs(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return this.request(`/audit-logs?${query.toString()}`);
  }

  static async getNotifications() {
    return this.request('/notifications');
  }
}
