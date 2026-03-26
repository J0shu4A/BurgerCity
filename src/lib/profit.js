// src/lib/profit.js

// Realistische Reingewinn-Margen (Net Profit) nach Abzug von Personal, Miete, etc.
// Ziel: Durchschnittlich ca. 10 - 15 %
const PRODUCT_MARGINS = {
  // Menüs (ca. 10-12% Reingewinn)
  "Lieferando Box (Family)": 0.10,
  "Hamburger Menü": 0.12,
  "Classic Cheese Burger Menü": 0.11,
  "Germans Best Burger Menü": 0.11,
  "Mamas Lieblings Burger Menü": 0.11,
  "1001 Nacht Burger Menü (Sucuk)": 0.10,
  "Tex Mex Burger Menü": 0.11,
  "Chicago Burger Menü": 0.11,
  "Burger in Blau Menü (Blauschimmel)": 0.10,
  "Türkisch Deluxe Burger Menü": 0.10,
  "Crispy Burger Menü": 0.12,
  "Chicken Nugget Menü": 0.12,

  // Einzelne Burger (ca. 10-12% Reingewinn)
  "Hamburger": 0.12,
  "Classic Cheese Burger": 0.11,
  "Germans Best Burger": 0.11,
  "Mamas Lieblings Burger": 0.11,
  "1001 Nacht Burger": 0.10,
  "Tex Mex Burger": 0.11,
  "Chicago Burger": 0.11,
  "Burger in Blau": 0.10,
  "Türkisch Deluxe Burger": 0.10,
  "Crispy Chicken Burger": 0.12,

  // Beilagen & Snacks (ca. 14-16% Reingewinn)
  "Pommes frites": 0.16,
  "Sweet Potato Fries": 0.15,
  "Chili Cheese Nuggets (4er)": 0.14,
  "Chicken Nuggets (6er)": 0.14,
  "Mozzarella Sticks (4er)": 0.14,
  "Zwiebelringe (6er)": 0.15,
  "Side Salad": 0.15,
  "Chicken Salad": 0.12,

  // Dips (sehr profitabel, ca. 20%)
  "Ketchup": 0.20,
  "Mayonnaise": 0.20,
  "Hausgemachtes Dressing": 0.18,
  "Barbequesauce": 0.20,

  // Getränke (ca. 16-18% Reingewinn)
  "Coca-Cola 0.33l": 0.18,
  "Coca-Cola Zero 0.33l": 0.18,
  "Fanta 0.33l": 0.18,
  "Sprite 0.33l": 0.18,
  "Ayran 0.25l": 0.16,
  "Wasser (still) 0.5l": 0.18
};

export function calculateTotalProfit(facts) {
  return facts.reduce((totalProfit, row) => {
    // Standardmarge von 12% (0.12) annehmen, falls Produkt nicht gefunden wird
    const margin = PRODUCT_MARGINS[row.product] || 0.12;
    
    // Umsatz der Zeile berechnen
    const revenue = Number(row.revenue ?? (row.qty * row.unit_price) ?? 0);
    
    // Gewinn aufsummieren
    return totalProfit + (revenue * margin);
  }, 0);
}