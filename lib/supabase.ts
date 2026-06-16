class MockQueryBuilder {
  table: string;
  filters: Array<{ col: string; val: any }> = [];
  sortField: string | null = null;
  sortAscending = true;
  limitCount: number | null = null;
  isSingle = false;
  insertData: any = null;
  updateData: any = null;
  isDelete = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ col: column, val: value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortField = column;
    this.sortAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  private getLocalData(): any[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`mock_db_${this.table}`);
    return raw ? JSON.parse(raw) : [];
  }

  private setLocalData(data: any[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`mock_db_${this.table}`, JSON.stringify(data));
  }

  async execute() {
    let items = this.getLocalData();

    // 1. Handle Insert
    if (this.insertData) {
      const toInsert = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const inserted = toInsert.map((item: any) => ({
        id: item.id || `local-id-${Math.random().toString(36).substring(2, 15)}`,
        created_at: item.created_at || new Date().toISOString(),
        ...item
      }));
      items = [...items, ...inserted];
      this.setLocalData(items);
      
      const resData = Array.isArray(this.insertData) ? inserted : inserted[0];
      return { data: resData, error: null };
    }

    // 2. Handle Filters (eq)
    if (this.filters.length > 0) {
      items = items.filter(item => 
        this.filters.every(filter => {
          if (filter.col === 'user_id') {
            return true; // Match any user_id locally
          }
          return item[filter.col] === filter.val;
        })
      );
    }

    // 3. Handle Update
    if (this.updateData) {
      const allItems = this.getLocalData();
      const updatedIds = new Set(items.map(i => i.id));
      const newItems = allItems.map(item => {
        if (updatedIds.has(item.id)) {
          return { ...item, ...this.updateData };
        }
        return item;
      });
      this.setLocalData(newItems);
      
      const updated = newItems.filter(item => updatedIds.has(item.id));
      return { data: this.isSingle ? updated[0] : updated, error: null };
    }

    // 4. Handle Delete
    if (this.isDelete) {
      const allItems = this.getLocalData();
      const deletedIds = new Set(items.map(i => i.id));
      const remaining = allItems.filter(item => !deletedIds.has(item.id));
      this.setLocalData(remaining);
      return { data: null, error: null };
    }

    // 5. Handle Sorting
    if (this.sortField) {
      items.sort((a, b) => {
        const valA = a[this.sortField!];
        const valB = b[this.sortField!];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    // 6. Handle submissions count select for tests table
    if (this.table === 'tests') {
      const rawSubs = typeof window !== 'undefined' ? localStorage.getItem('mock_db_submissions') : null;
      const allSubs = rawSubs ? JSON.parse(rawSubs) : [];
      items = items.map(test => {
        const testSubs = allSubs.filter((s: any) => s.test_id === test.id);
        return {
          ...test,
          submissions: [{ count: testSubs.length }]
        };
      });
    }

    // 7. Handle Limit
    if (this.limitCount !== null) {
      items = items.slice(0, this.limitCount);
    }

    // 8. Handle Single
    if (this.isSingle) {
      return { data: items[0] || null, error: items[0] ? null : { message: "Not found" } };
    }

    return { data: items, error: null };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const mockAuth = {
  getUser: async () => {
    if (typeof window === 'undefined') return { data: { user: null }, error: null as any };
    const session = sessionStorage.getItem("teacher_auth") === "true";
    const user = session ? { id: "00000000-0000-0000-0000-000000000000", email: "teacher@example.com" } : null;
    return { data: { user }, error: null as any };
  },
  getSession: async () => {
    if (typeof window === 'undefined') return { data: { session: null }, error: null as any };
    const session = sessionStorage.getItem("teacher_auth") === "true";
    const user = session ? { id: "00000000-0000-0000-0000-000000000000", email: "teacher@example.com" } : null;
    return { data: { session: user ? { user } : null }, error: null as any };
  },
  signInWithPassword: async ({ email, password }: any) => {
    if (password === "admin123") {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("teacher_auth", "true");
      }
      return { data: { user: { id: "00000000-0000-0000-0000-000000000000", email } }, error: null as any };
    }
    return { data: null, error: { message: "Incorrect password" } as any };
  },
  signUp: async ({ email, password }: any) => {
    return { data: { user: { id: "00000000-0000-0000-0000-000000000000", email } }, error: null as any };
  },
  signOut: async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("teacher_auth");
    }
    return { error: null as any };
  },
  resetPasswordForEmail: async (email: string, options?: any) => {
    return { error: null as any };
  },
  updateUser: async ({ password }: any) => {
    return { error: null as any };
  }
};

export const supabase = {
  auth: mockAuth,
  from: (table: string) => new MockQueryBuilder(table)
};
