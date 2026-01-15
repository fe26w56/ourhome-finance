# System Design: Add Settlement History Link to Reports

## 1. Overview
This document designs the implementation of a "Settlement History" navigation link in the Reports screen, based on the requirements defined in `requirements.md`.

## 2. Architecture & Components

### 2.1 Modified Component: `Reports.tsx`
- **Location**: `screens/Reports.tsx`
- **Logic**:
  - Utilize existing `useNavigate` hook (already present as `navigate`).
  - Logic is purely presentational; no new state management or data fetching is required for the button itself.

### 2.2 UI Structure
Inside the `activeTab === 'summary'` block, immediately after the "Compared to last month" card:

```tsx
<button
  onClick={() => navigate('/settlement')}
  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-transform"
>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
      <span className="material-symbols-outlined">history</span>
    </div>
    <span className="font-bold text-[#111812] dark:text-white">
      Settlement History
    </span>
  </div>
  <span className="material-symbols-outlined text-gray-400">chevron_right</span>
</button>
```

### 2.3 Styling Strategy
- **Container**: Match existing cards (`rounded-2xl`, `bg-white`, `border`, `shadow-sm`).
- **Interaction**: Add touch feedback (`active:scale-[0.98]`) to indicate clickability.
- **Icon**: Use `history` icon with an accent color (e.g., Orange or Primary color) to distinguish it from the comparison card.
- **Typography**: Bold text for label, matching other headers.

## 3. Data Flow
- **Input**: User click.
- **Process**: `navigate('/settlement')`.
- **Output**: Route change to Settlement screen.

## 4. Internationalization (i18n)
- Although the requirement implies "Settlement History", we should consider using `t('settlementHistory')` or similar if available, or hardcode "Settlement History" / "精算履歴" if translation keys are missing, but for now we will use a direct label or existing common keys.
- Checking `src/locales/en/budget.json` (or `common.json`) might be needed, but strictly for this design, we'll assume we can add a simple label.
