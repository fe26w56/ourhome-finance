# データ同期戦略

## 概要

本ドキュメントでは、複数ユーザー間でのリアルタイムデータ同期の戦略を定義します。

---

## 同期の種類

| 種類 | 用途 | 技術 |
|------|------|------|
| リアルタイム同期 | 取引、精算残高 | Supabase Realtime |
| ポーリング | 統計、レポート | TanStack Query (refetchInterval) |
| オンデマンド | 設定、カテゴリ | TanStack Query (手動refetch) |

---

## Supabase Realtime 設計

### 購読対象テーブル

| テーブル | イベント | 用途 |
|---------|---------|------|
| transactions | INSERT, UPDATE, DELETE | 取引一覧の更新 |
| transaction_splits | INSERT, UPDATE | 精算残高の更新 |
| settlements | INSERT | 精算履歴の更新 |
| budgets | INSERT, UPDATE, DELETE | 予算の更新 |
| goals | INSERT, UPDATE | 目標の更新 |
| goal_contributions | INSERT | 目標進捗の更新 |

### 購読チャンネル構成

```typescript
// グループ単位でチャンネルを作成
const channel = supabase
  .channel(`group:${groupId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'transactions',
      filter: `group_id=eq.${groupId}`,
    },
    handleTransactionChange
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'transaction_splits',
      // transaction経由でフィルタリング
    },
    handleSplitChange
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'settlements',
      filter: `group_id=eq.${groupId}`,
    },
    handleSettlementChange
  )
  .subscribe();
```

### イベントハンドラ

```typescript
// 取引変更ハンドラ
function handleTransactionChange(payload: RealtimePostgresChangesPayload) {
  const queryClient = useQueryClient();
  
  switch (payload.eventType) {
    case 'INSERT':
      // 新しい取引を追加
      queryClient.setQueryData(
        queryKeys.transactions(groupId),
        (old: Transaction[] | undefined) => {
          if (!old) return [payload.new as Transaction];
          return [payload.new as Transaction, ...old];
        }
      );
      
      // 統計を無効化
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthlyStats(groupId, selectedMonth),
      });
      
      // トースト表示（自分以外の変更の場合）
      if (payload.new.created_by !== currentUserId) {
        showToast(`${memberName}が取引を追加しました`, 'info');
      }
      break;
      
    case 'UPDATE':
      // 既存の取引を更新
      queryClient.setQueryData(
        queryKeys.transactions(groupId),
        (old: Transaction[] | undefined) => {
          if (!old) return old;
          return old.map(t => 
            t.id === payload.new.id ? payload.new as Transaction : t
          );
        }
      );
      break;
      
    case 'DELETE':
      // 取引を削除
      queryClient.setQueryData(
        queryKeys.transactions(groupId),
        (old: Transaction[] | undefined) => {
          if (!old) return old;
          return old.filter(t => t.id !== payload.old.id);
        }
      );
      break;
  }
}
```

---

## 楽観的更新（Optimistic Updates）

### 取引作成

```typescript
const createTransactionMutation = useMutation({
  mutationFn: transactionService.create,
  
  onMutate: async (newTransaction) => {
    // クエリをキャンセル
    await queryClient.cancelQueries({
      queryKey: queryKeys.transactions(groupId),
    });
    
    // 現在のデータを保存
    const previousTransactions = queryClient.getQueryData(
      queryKeys.transactions(groupId)
    );
    
    // 楽観的に更新
    const optimisticTransaction = {
      ...newTransaction,
      id: `temp-${Date.now()}`, // 仮ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    queryClient.setQueryData(
      queryKeys.transactions(groupId),
      (old: Transaction[] | undefined) => {
        if (!old) return [optimisticTransaction];
        return [optimisticTransaction, ...old];
      }
    );
    
    // ロールバック用に保存
    return { previousTransactions };
  },
  
  onError: (err, newTransaction, context) => {
    // エラー時はロールバック
    queryClient.setQueryData(
      queryKeys.transactions(groupId),
      context?.previousTransactions
    );
    showToast('保存に失敗しました', 'error');
  },
  
  onSuccess: (data) => {
    // 成功時は仮データを実データで置換
    // Realtimeで自動的に更新されるが、念のため
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactions(groupId),
    });
  },
});
```

### 取引削除

```typescript
const deleteTransactionMutation = useMutation({
  mutationFn: transactionService.delete,
  
  onMutate: async (transactionId) => {
    await queryClient.cancelQueries({
      queryKey: queryKeys.transactions(groupId),
    });
    
    const previousTransactions = queryClient.getQueryData(
      queryKeys.transactions(groupId)
    );
    
    // 楽観的に削除
    queryClient.setQueryData(
      queryKeys.transactions(groupId),
      (old: Transaction[] | undefined) => {
        if (!old) return old;
        return old.filter(t => t.id !== transactionId);
      }
    );
    
    return { previousTransactions };
  },
  
  onError: (err, transactionId, context) => {
    queryClient.setQueryData(
      queryKeys.transactions(groupId),
      context?.previousTransactions
    );
    showToast('削除に失敗しました', 'error');
  },
});
```

---

## オフライン対応

### オフライン検知

```typescript
// hooks/useOnlineStatus.ts
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}
```

### オフラインキュー

```typescript
// stores/useOfflineStore.ts
interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

interface OfflineStore {
  pendingOperations: PendingOperation[];
  addPendingOperation: (op: Omit<PendingOperation, 'id' | 'timestamp'>) => void;
  removePendingOperation: (id: string) => void;
  processPendingOperations: () => Promise<void>;
}

const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      pendingOperations: [],
      
      addPendingOperation: (op) => {
        set((state) => ({
          pendingOperations: [
            ...state.pendingOperations,
            {
              ...op,
              id: `pending-${Date.now()}`,
              timestamp: Date.now(),
            },
          ],
        }));
      },
      
      removePendingOperation: (id) => {
        set((state) => ({
          pendingOperations: state.pendingOperations.filter(op => op.id !== id),
        }));
      },
      
      processPendingOperations: async () => {
        const { pendingOperations, removePendingOperation } = get();
        
        // 古い順に処理
        const sorted = [...pendingOperations].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        
        for (const op of sorted) {
          try {
            switch (op.type) {
              case 'create':
                await supabase.from(op.table).insert(op.data);
                break;
              case 'update':
                await supabase.from(op.table).update(op.data).eq('id', op.data.id);
                break;
              case 'delete':
                await supabase.from(op.table).delete().eq('id', op.data.id);
                break;
            }
            removePendingOperation(op.id);
          } catch (error) {
            console.error('Failed to process pending operation:', error);
            // エラーの場合は次の操作に進む
            // 競合解決が必要な場合はここで処理
          }
        }
      },
    }),
    {
      name: 'offline-store',
    }
  )
);
```

### オンライン復帰時の同期

```typescript
// App.tsx
function App() {
  const isOnline = useOnlineStatus();
  const { processPendingOperations, pendingOperations } = useOfflineStore();
  const previousOnlineStatus = useRef(isOnline);
  
  useEffect(() => {
    // オフライン → オンラインに変わった時
    if (!previousOnlineStatus.current && isOnline) {
      // 保留中の操作を処理
      if (pendingOperations.length > 0) {
        processPendingOperations();
        showToast(`${pendingOperations.length}件のデータを同期しました`, 'success');
      }
      
      // 最新データを取得
      queryClient.invalidateQueries();
    }
    
    previousOnlineStatus.current = isOnline;
  }, [isOnline]);
  
  // オフライン時の通知バー
  if (!isOnline) {
    return (
      <>
        <OfflineBanner />
        {/* ... */}
      </>
    );
  }
  
  return (/* ... */);
}
```

---

## 競合解決

### 競合シナリオ

| シナリオ | 解決方法 |
|---------|---------|
| 同時編集 | Last Write Wins（最後の書き込みが勝つ） |
| オフライン中の編集 | サーバーデータを優先、ユーザーに通知 |
| 削除済みの編集 | エラー通知、ユーザーに再操作を促す |

### 競合検出

```typescript
// updated_at を使用した競合検出
async function updateTransaction(
  id: string,
  updates: Partial<Transaction>,
  expectedUpdatedAt: string
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('updated_at', expectedUpdatedAt) // 楽観的ロック
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      throw new ConflictError('他のユーザーが編集中です。最新データを確認してください。');
    }
    throw error;
  }
  
  return data;
}
```

### 競合解決UI

```typescript
// 競合発生時のダイアログ
function ConflictDialog({ 
  localData, 
  serverData, 
  onKeepLocal, 
  onKeepServer 
}: Props) {
  return (
    <Dialog open>
      <DialogTitle>データの競合が発生しました</DialogTitle>
      <DialogContent>
        <p>他のユーザーがこのデータを編集しました。</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4>あなたの変更</h4>
            <pre>{JSON.stringify(localData, null, 2)}</pre>
          </div>
          <div>
            <h4>サーバーのデータ</h4>
            <pre>{JSON.stringify(serverData, null, 2)}</pre>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onKeepLocal}>自分の変更を保持</Button>
        <Button onClick={onKeepServer}>サーバーのデータを使用</Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## キャッシュ戦略

### キャッシュ設定

```typescript
// TanStack Query の設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分間はfresh
      cacheTime: 1000 * 60 * 30, // 30分間キャッシュ保持
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});
```

### データ種別ごとのキャッシュ設定

| データ種別 | staleTime | refetchInterval | 理由 |
|-----------|-----------|-----------------|------|
| 取引一覧 | 0 | - | Realtimeで更新されるため |
| カテゴリ | 5分 | - | 頻繁に変更されない |
| 予算 | 1分 | - | 月に数回程度の変更 |
| 統計 | 1分 | 5分 | 取引追加で変わるが即時性は低い |
| ユーザー設定 | 10分 | - | 自分しか変更しない |

```typescript
// 取引一覧（Realtimeで更新）
useQuery({
  queryKey: queryKeys.transactions(groupId),
  queryFn: () => transactionService.getAll(groupId),
  staleTime: 0, // 常にstale扱い
});

// カテゴリ
useQuery({
  queryKey: queryKeys.categories(groupId),
  queryFn: () => categoryService.getAll(groupId),
  staleTime: 1000 * 60 * 5, // 5分
});

// 統計
useQuery({
  queryKey: queryKeys.monthlyStats(groupId, yearMonth),
  queryFn: () => statsService.getMonthlySummary(groupId, yearMonth),
  staleTime: 1000 * 60 * 1, // 1分
  refetchInterval: 1000 * 60 * 5, // 5分ごとに自動更新
});
```

---

## パフォーマンス最適化

### 購読の最適化

```typescript
// 画面単位で必要な購読のみ
function useTransactionSubscription(groupId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!groupId) return;
    
    const channel = supabase
      .channel(`transactions:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `group_id=eq.${groupId}`,
        },
        handleChange
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);
}

// 使用例: 必要な画面でのみ購読
function Home() {
  useTransactionSubscription(groupId);
  // ...
}
```

### バッチ更新

```typescript
// 複数の更新をバッチで処理
function useBatchInvalidation() {
  const queryClient = useQueryClient();
  const pendingInvalidations = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const scheduleInvalidation = useCallback((queryKey: string) => {
    pendingInvalidations.current.add(queryKey);
    
    // 100ms後にまとめて無効化
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      for (const key of pendingInvalidations.current) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      pendingInvalidations.current.clear();
    }, 100);
  }, [queryClient]);
  
  return scheduleInvalidation;
}
```

---

## 同期フロー図

```
┌─────────────────────────────────────────────────────────────┐
│                      User A (作成)                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ 1. 取引作成
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   楽観的更新 (UI即時反映)                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ 2. API呼び出し
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  PostgreSQL  │───▶│   Realtime   │───▶│  Broadcast   │  │
│  │   (INSERT)   │    │  (postgres   │    │  (to all     │  │
│  │              │    │   changes)   │    │  subscribers)│  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    User A       │ │    User B       │ │    User C       │
│  (確定反映)      │ │  (新規反映)      │ │  (新規反映)      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

*最終更新: 2025年1月*
