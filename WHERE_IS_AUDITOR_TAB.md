# Where is the Auditor Tab?

## 🔍 The Issue

The tabs are controlled by a setting: **`alwaysShowTabs`**

Looking at line 19 in `BoringHeader.swift`:
```swift
if (!tvm.isEmpty || coordinator.alwaysShowTabs) && Defaults[.boringShelf] {
    TabSelectionView()  // ← Shows the tabs
}
```

**The tabs show if:**
- Shelf has files (`!tvm.isEmpty`) OR
- `alwaysShowTabs` setting is enabled
- AND shelf feature is enabled

---

## ✅ **Quick Fix: Force Show Auditor Tab**

### **Option 1: Enable "Always Show Tabs" Setting**

1. Click the **gear icon** in the notch (top right)
2. Look for **"Always Show Tabs"** setting
3. Turn it ON
4. The tabs should appear at the top-left

OR

### **Option 2: Switch Directly to Auditor**

Click one of the **existing tabs** (Home or Shelf icons) - the Auditor tab should be there as the 3rd tab!

You should see 3 icons:
- 🏠 Home
- 📦 Shelf
- 🔍 Auditor

---

## 🎯 **Alternative: Add a Menu Bar Button**

Let me create a menu bar item to switch to Auditor directly!

