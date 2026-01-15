# Implementation Plan: Add Settlement History Link to Reports

## 1. Overview
This plan outlines the steps to add the Settlement History link to the Reports screen, based on `design.md`.

## 2. Implementation Steps

### Step 1: Edit `screens/Reports.tsx`
- **Target**: `screens/Reports.tsx`
- **Action**:
  - Locate the `activeTab === 'summary'` render block.
  - Find the "Compared to last month" card rendering logic (`{expenseDiff && ...}`).
  - Insert the new button component immediately after that block.
- **Code Snippet**:
  ```tsx
  {/* Settlement History Link */}
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

### Step 2: Verification
- **Manual Test**:
  1. Open Reports screen.
  2. Ensure "Summary" tab is active.
  3. Verify the "Settlement History" button appears below the comparison card.
  4. Click the button and verify navigation to `/settlement`.

## 3. Dependencies
- None. Uses existing `useNavigate` and Tailwind CSS classes.
