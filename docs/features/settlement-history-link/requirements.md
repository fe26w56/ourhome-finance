# Requirements Definition: Add Settlement History Link to Reports

## 1. Overview
User wants to access the "Past Settlements List" from the Reports screen. Currently, the settlement history is located on the Settlement screen (`/settlement`).

## 2. Goals
- Add a navigation entry point to the Settlement screen from the Reports screen.
- Place it below the "Compared to last month" section.
- Ensure the design is consistent with the existing UI ("nicely added").

## 3. Scope
- **File**: `screens/Reports.tsx`
- **Component**: Add a new UI element below the expense difference card.
- **Action**: Navigate to `/settlement`.

## 4. UI/UX Requirements
- **Location**: Inside the Summary tab (`activeTab === 'summary'`), at the bottom of the summary cards list (specifically after `expenseDiff` block).
- **Style**:
    - Should match the existing "card" style (rounded corners, white background, shadow) OR a distinct button style.
    - Given the context of "Reports", a card that says "Settlement History" with an icon seems appropriate.

## 5. Ambiguities & Questions (for Consultation)
1. **Destination**: Is `/settlement` the correct target? (The Settlement screen contains the history list at the bottom).
2. **Label**: What should the link text be? "Settlement History"? "View Past Settlements"? (Ideally use i18n).
