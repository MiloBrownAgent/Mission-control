import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const DAY_TYPE = v.union(
  v.literal("Monday"),
  v.literal("Tuesday"),
  v.literal("Wednesday"),
  v.literal("Thursday"),
  v.literal("Friday"),
  v.literal("Saturday"),
  v.literal("Sunday")
);

const MEAL_TYPE = v.union(
  v.literal("breakfast"),
  v.literal("lunch"),
  v.literal("dinner")
);

type MealType = "breakfast" | "lunch" | "dinner";

type NytCandidate = {
  name: string;
  mealType: MealType;
  url: string;
  imageUrl: string;
  ingredients: string[];
  servings: number;
};

const NYT_DINNER_POOL: NytCandidate[] = [
  {
    name: "Sheet-Pan Roasted Salmon With Pea Pesto",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/1025367-sheet-pan-roasted-salmon-with-pea-pesto",
    imageUrl: "https://static01.nyt.com/images/2024/05/07/multimedia/dp-salmon-pea-pesto-jpgv/dp-salmon-pea-pesto-jpgv-square640.jpg?quality=75&auto=webp",
    ingredients: ["1½ lbs fingerling potatoes", "1 cup olive oil", "Salt and pepper", "4 skin-on salmon fillets (6 oz each)", "½ cup fresh or frozen green peas", "⅓ cup roasted almonds", "4 garlic cloves", "1 cup packed fresh basil leaves", "½ cup lemon juice"],
    servings: 4,
  },
  {
    name: "Sheet-Pan Shrimp With Tomatoes, Feta and Oregano",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/1015194-sheet-pan-shrimp-with-tomatoes-feta-and-oregano",
    imageUrl: "https://static01.nyt.com/images/2022/08/09/dining/mb-greek-broiled-shrimp-update/mb-greek-broiled-shrimp-update-square640.jpg?quality=75&auto=webp",
    ingredients: ["1 garlic clove", "1 tsp salt", "1 tbsp fresh oregano", "1 tbsp lemon juice", "2 tbsp olive oil", "Black pepper", "1½ lbs peeled shrimp", "Cherry tomatoes", "Crumbled feta"],
    servings: 4,
  },
  {
    name: "Cheesy Gnocchi With Corn and Pesto",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/759796803-cheesy-gnocchi-with-corn-and-pesto",
    imageUrl: "https://static01.nyt.com/images/2025/10/07/multimedia/cg-cheesy-gnocchi-skillet-pzvk/cg-cheesy-gnocchi-skillet-pzvk-square640.jpg?quality=75&auto=webp",
    ingredients: ["3 tbsp extra-virgin olive oil", "1 lb shelf-stable gnocchi", "3 cups corn kernels (canned or fresh)", "½ cup store-bought pesto", "Salt and pepper", "8 oz grated whole-milk mozzarella"],
    servings: 4,
  },
  {
    name: "Spinach Meatballs With Pasta",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/770849339-spinach-meatballs-with-pasta",
    imageUrl: "https://static01.nyt.com/images/2026/02/12/multimedia/AS-Pasta-with-spinach-meatballs-fqhk/AS-Pasta-with-spinach-meatballs-fqhk-square640.jpg?quality=75&auto=webp",
    ingredients: ["10 oz frozen chopped spinach, thawed", "¾ cup panko", "1 large egg", "5 garlic cloves", "Salt and pepper", "8 oz ground beef", "8 oz ground pork", "½ cup Parmesan", "3 tbsp olive oil", "2 (28-oz) cans crushed tomatoes", "1 lb spaghetti"],
    servings: 4,
  },
  {
    name: "Salmon and Cherry Tomato Curry",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/765904408-salmon-and-cherry-tomato-curry",
    imageUrl: "https://static01.nyt.com/images/2025/12/19/multimedia/al-Salmon-and-Cherry-Tomato-Curry-vlmh/al-Salmon-and-Cherry-Tomato-Curry-vlmh-square640.jpg?quality=75&auto=webp",
    ingredients: ["4 salmon fillets (6 oz each)", "Salt and pepper", "2 tbsp ghee or coconut oil", "3 garlic cloves", "1 tbsp fresh ginger", "1 chile, sliced", "1 lb cherry tomatoes", "½ tsp cumin seeds", "½ tsp coriander", "½ tsp turmeric", "1 (14-oz) can coconut milk", "5 oz baby spinach", "Cooked rice"],
    servings: 4,
  },
  {
    name: "Sheet-Pan Sausages and Brussels Sprouts With Honey Mustard",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/1020747-sheet-pan-sausages-and-brussels-sprouts-with-honey-mustard",
    imageUrl: "https://static01.nyt.com/images/2023/10/10/dining/as-sheetpan-honey-mustard-glazed-sausage-and-brussles/as-sheetpan-honey-mustard-glazed-sausage-and-brussles-square640-v2.jpg?quality=75&auto=webp",
    ingredients: ["1 lb Italian sausage or bratwurst", "1 lb brussels sprouts, halved", "1 lb small potatoes, halved", "2 tbsp olive oil", "Salt and pepper", "4 tsp honey", "1 tbsp Dijon mustard", "1 tbsp yellow mustard seeds"],
    servings: 4,
  },
  {
    name: "Sheet-Pan Chicken With Black Beans and Squash",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/771531010-sheet-pan-chicken-with-black-beans-and-squash",
    imageUrl: "https://static01.nyt.com/images/2026/02/19/multimedia/AS-Sheet-pan-chicken-with-winter-squash-and-black-beans-pjqm/AS-Sheet-pan-chicken-with-winter-squash-and-black-beans-pjqm-square640.jpg?quality=75&auto=webp",
    ingredients: ["1½ lbs bone-in skin-on chicken thighs", "1 lb cubed butternut squash", "1 (15-oz) can black beans, rinsed", "1 red onion, sliced", "3 tbsp avocado oil", "2 tsp chili powder", "1 tsp cumin", "Salt", "Cilantro, pepitas, sour cream, lime"],
    servings: 4,
  },
  {
    name: "Sheet-Pan Steak and Pepper Tacos",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/771520721-sheet-pan-steak-and-pepper-tacos",
    imageUrl: "https://static01.nyt.com/images/2026/02/19/multimedia/KF-Easy-Sheet-Pan-Tacos-de-Alambre-jktf/KF-Easy-Sheet-Pan-Tacos-de-Alambre-jktf-square640.jpg?quality=75&auto=webp",
    ingredients: ["4 slices bacon, diced", "1 tbsp soy sauce", "1 tbsp Worcestershire sauce", "2 garlic cloves", "2 limes", "1 lb flank or skirt steak", "½ white onion", "6 oz mushrooms", "1 large green pepper", "Salt and pepper", "6 slices Muenster cheese", "8 corn tortillas", "Salsa"],
    servings: 4,
  },
  {
    name: "Ginger Salmon Lettuce Wraps",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/771520929-ginger-salmon-lettuce-wraps",
    imageUrl: "https://static01.nyt.com/images/2026/02/20/multimedia/KF-Sheet-Pan-Ginger-Lime-Salmon-Lettuce-Bites-lfmb/KF-Sheet-Pan-Ginger-Lime-Salmon-Lettuce-Bites-lfmb-square640.jpg?quality=75&auto=webp",
    ingredients: ["4 skinless salmon fillets (4 oz each)", "2-inch piece fresh ginger, peeled", "¼ cup rice vinegar", "¼ cup fish sauce", "2 tbsp sugar", "2 tbsp lime juice", "2 garlic cloves", "1 serrano chile", "1 tbsp vegetable oil", "2 heads butter lettuce", "Fresh cilantro or mint", "Sliced cucumbers, radishes, carrots", "Warm cooked rice"],
    servings: 4,
  },
  {
    name: "Sheet-Pan Malai Chicken and Potatoes",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/1026512-sheet-pan-malai-chicken-and-potatoes",
    imageUrl: "https://static01.nyt.com/images/2025/04/29/multimedia/ZI-Roasted-Malai-Chicken-and-Potatoes-zpkw/ZI-Roasted-Malai-Chicken-and-Potatoes-zpkw-square640.jpg?quality=75&auto=webp",
    ingredients: ["1½ lbs fingerling potatoes", "1 medium yellow onion", "1 tbsp ghee or olive oil", "Salt", "4 bone-in skin-on chicken thighs", "1 tbsp lemon juice", "2 tbsp heavy cream", "¼ cup full-fat plain yogurt", "⅓ cup cilantro", "5 garlic cloves", "1½-inch piece fresh ginger", "1–2 serrano chiles", "1½ tsp garam masala"],
    servings: 4,
  },
  {
    name: "Quick Fish Chowder With Hot Butter Crackers",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/770134622-quick-fish-chowder-with-hot-butter-crackers",
    imageUrl: "https://static01.nyt.com/images/2026/02/03/multimedia/SL-cod-and-fennel-chowder-jhkz/SL-cod-and-fennel-chowder-jhkz-square640.jpg?quality=75&auto=webp",
    ingredients: ["4 tbsp unsalted butter", "1 large fennel bulb, sliced", "12 oz Yukon Gold potatoes, thinly sliced", "1 large shallot, sliced", "4 garlic cloves, sliced", "Salt and pepper", "1 (8-oz) bottle clam juice", "1 lb cod fillet, cut into 1-inch pieces", "¼ cup half-and-half", "2 tbsp butter", "1½ tsp hot paprika", "Saltine crackers"],
    servings: 4,
  },
  {
    name: "Sheet-Pan Feta With Chickpeas and Tomatoes",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/1023371-sheet-pan-feta-with-chickpeas-and-tomatoes",
    imageUrl: "https://static01.nyt.com/images/2022/07/28/dining/as-roasted-feta-and-chickpeas/merlin_209335479_52115ec4-9a9b-483e-b749-ed40dc44a69d-square640.jpg?quality=75&auto=webp",
    ingredients: ["3 cups cooked chickpeas (or two 15-oz cans)", "2 pints cherry tomatoes", "1 shallot, sliced", "¼ cup olive oil", "2 tbsp honey", "1 tsp gochugaru or red pepper flakes", "Salt", "2 blocks feta (6–8 oz each), sliced 1-inch thick"],
    servings: 4,
  },
  {
    name: "One-Pot White Wine Pasta",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/770670402-one-pot-white-wine-pasta",
    imageUrl: "https://static01.nyt.com/images/2026/02/10/multimedia/AS-One-pan-white-wine-pasta-lgfb/AS-One-pan-white-wine-pasta-lgfb-square640.jpg?quality=75&auto=webp",
    ingredients: ["4 tbsp unsalted butter", "8 anchovy fillets", "¼ tsp crushed red pepper", "12 oz spaghetti", "1 (750ml) bottle dry white wine", "Salt", "½ cup chopped parsley"],
    servings: 4,
  },
  {
    name: "Hóng Shāo Ròu (Red-Braised Pork Belly)",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/770916309-hong-shao-rou-red-braised-pork-belly",
    imageUrl: "https://static01.nyt.com/images/2026/02/13/multimedia/BL-Hong-Shao-Rou-Red-Braised-Pork-Belly-jtzm/BL-Hong-Shao-Rou-Red-Braised-Pork-Belly-jtzm-square640.jpg?quality=75&auto=webp",
    ingredients: ["1½ lbs boneless pork belly", "2 tbsp neutral oil", "4 tbsp rock sugar", "3 tbsp dark soy sauce", "1 cup chicken stock", "¼ cup light soy sauce", "¼ cup Shaoxing wine", "3 whole star anise", "2 slices fresh ginger", "4 scallions", "Cooked white rice"],
    servings: 4,
  },
  {
    name: "Swordfish au Poivre",
    mealType: "dinner",
    url: "https://cooking.nytimes.com/recipes/1021120-swordfish-au-poivre",
    imageUrl: "https://static01.nyt.com/images/2020/06/17/dining/11pairrex/11pairrex-square640-v2.jpg?quality=75&auto=webp",
    ingredients: ["24 oz swordfish (1-inch thick, 4 portions)", "Fine sea salt", "1½ tbsp crushed black peppercorns", "2 tbsp olive oil", "1 tbsp unsalted butter", "1 large shallot, minced", "½ cup Cognac or brandy", "⅔ cup heavy cream", "1 tbsp minced flat-leaf parsley"],
    servings: 4,
  },
];

// Legacy support for non-dinner candidates
const NYT_CANDIDATES = NYT_DINNER_POOL;

const normalize = (value: string) => value.trim().toLowerCase();

function mergeGroceryItems(existingText: string | undefined, newItems: string[]) {
  const merged: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const key = normalize(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(trimmed);
  };

  for (const line of (existingText ?? "").split("\n")) pushUnique(line);
  for (const line of newItems) pushUnique(line);

  return merged.join("\n");
}

function replacementsFor(mealType: MealType, excludedNames: Set<string>) {
  return NYT_CANDIDATES
    .filter((candidate) => candidate.mealType === mealType)
    .filter((candidate) => !excludedNames.has(normalize(candidate.name)));
}

function replacementPayload(candidate: NytCandidate) {
  return {
    name: candidate.name,
    url: candidate.url,
    notes: "NYT Cooking pick",
  };
}

export const suggestDinnersForWeek = mutation({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
    const now = Date.now();

    // Get existing dinners for this week
    const existing = await ctx.db
      .query("meals")
      .withIndex("by_week", (q) => q.eq("weekStart", args.weekStart))
      .collect();
    const existingDinners = existing.filter((m) => m.mealType === "dinner");

    // Keep approved dinners, delete pending/denied so we can replace them with real images
    const approvedNames = new Set(
      existingDinners.filter((m) => m.status === "approved").map((m) => normalize(m.name))
    );
    for (const d of existingDinners) {
      if (d.status !== "approved") {
        await ctx.db.delete(d._id);
      }
    }

    // Shuffle pool excluding already-approved names
    const pool = [...NYT_DINNER_POOL].filter((c) => !approvedNames.has(normalize(c.name)));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let pick = 0;
    for (const day of DAYS) {
      // Skip if already approved
      const alreadyApproved = existingDinners.find((m) => m.day === day && m.status === "approved");
      if (alreadyApproved) continue;

      const candidate = pool[pick % pool.length];
      pick++;

      await ctx.db.insert("meals", {
        weekStart: args.weekStart,
        day,
        mealType: "dinner",
        name: candidate.name,
        url: candidate.url,
        imageUrl: candidate.imageUrl,
        ingredients: candidate.ingredients,
        servings: candidate.servings,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { created: pick };
  },
});

export const getWeek = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meals")
      .withIndex("by_week", (q) => q.eq("weekStart", args.weekStart))
      .collect();
  },
});

export const setMeal = mutation({
  args: {
    weekStart: v.string(),
    day: DAY_TYPE,
    mealType: MEAL_TYPE,
    name: v.string(),
    notes: v.optional(v.string()),
    sorenMeal: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("meals")
      .withIndex("by_week_day_meal", (q) =>
        q
          .eq("weekStart", args.weekStart)
          .eq("day", args.day)
          .eq("mealType", args.mealType)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        notes: args.notes,
        sorenMeal: args.sorenMeal,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("meals", {
        weekStart: args.weekStart,
        day: args.day,
        mealType: args.mealType,
        name: args.name,
        notes: args.notes,
        sorenMeal: args.sorenMeal,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const upsertMeal = mutation({
  args: {
    weekStart: v.string(),
    day: DAY_TYPE,
    mealType: MEAL_TYPE,
    name: v.string(),
    notes: v.optional(v.string()),
    sorenMeal: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"))),
    url: v.optional(v.string()),
    replacements: v.optional(v.array(v.object({
      name: v.string(),
      url: v.optional(v.string()),
      notes: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("meals")
      .withIndex("by_week_day_meal", (q) =>
        q.eq("weekStart", args.weekStart).eq("day", args.day).eq("mealType", args.mealType)
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        notes: args.notes,
        sorenMeal: args.sorenMeal,
        status: args.status,
        url: args.url,
        replacements: args.replacements,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("meals", {
        weekStart: args.weekStart,
        day: args.day,
        mealType: args.mealType,
        name: args.name,
        notes: args.notes,
        sorenMeal: args.sorenMeal,
        status: args.status,
        url: args.url,
        replacements: args.replacements,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const approveMeal = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const meal = await ctx.db.get(args.id);
    if (!meal) throw new Error("Meal not found");

    await ctx.db.patch(args.id, { status: "approved", updatedAt: Date.now() });

    const ingredients = meal.ingredients?.length
      ? meal.ingredients
      : [`${meal.name} ingredients (see recipe)`];

    const existingList = await ctx.db
      .query("groceryLists")
      .withIndex("by_week", (q) => q.eq("weekStart", meal.weekStart))
      .first();

    const mergedItems = mergeGroceryItems(existingList?.items, ingredients);
    const now = Date.now();

    if (existingList) {
      await ctx.db.patch(existingList._id, { items: mergedItems, updatedAt: now });
    } else {
      await ctx.db.insert("groceryLists", {
        weekStart: meal.weekStart,
        items: mergedItems,
        updatedAt: now,
      });
    }
  },
});

export const denyMeal = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "denied", updatedAt: Date.now() });
  },
});

export const rejectAndReplaceMeal = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const meal = await ctx.db.get(args.id);
    if (!meal) throw new Error("Meal not found");

    const excludedNames = new Set<string>([
      normalize(meal.name),
      ...(meal.replacements ?? []).map((replacement) => normalize(replacement.name)),
    ]);

    // Use new dinner pool
    const pool = NYT_DINNER_POOL.filter((c) => !excludedNames.has(normalize(c.name)));
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const next = pool[0] ?? NYT_DINNER_POOL[0];

    await ctx.db.patch(args.id, {
      name: next.name,
      url: next.url,
      imageUrl: next.imageUrl,
      ingredients: next.ingredients,
      servings: next.servings,
      status: "pending",
      replacements: pool.slice(1, 4).map((c) => ({ name: c.name, url: c.url })),
      updatedAt: Date.now(),
    });

    return { id: args.id, name: next.name };
  },
});

export const replaceMeal = mutation({
  args: {
    id: v.id("meals"),
    name: v.string(),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      url: args.url,
      notes: args.notes,
      status: "approved",
      updatedAt: Date.now(),
    });
  },
});

// NOTE: When generating meals via cron, ideally include imageUrl and ingredients for richer modal display.
export const updateMealDetails = mutation({
  args: {
    weekStart: v.string(),
    day: DAY_TYPE,
    mealType: MEAL_TYPE,
    imageUrl: v.optional(v.string()),
    ingredients: v.optional(v.array(v.string())),
    servings: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("meals")
      .withIndex("by_week_day_meal", (q) =>
        q.eq("weekStart", args.weekStart).eq("day", args.day).eq("mealType", args.mealType)
      )
      .first();
    if (!existing) throw new Error("Meal not found");
    await ctx.db.patch(existing._id, {
      imageUrl: args.imageUrl,
      ingredients: args.ingredients,
      servings: args.servings,
      updatedAt: Date.now(),
    });
  },
});

export const clearMeal = mutation({
  args: {
    weekStart: v.string(),
    day: DAY_TYPE,
    mealType: MEAL_TYPE,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("meals")
      .withIndex("by_week_day_meal", (q) =>
        q
          .eq("weekStart", args.weekStart)
          .eq("day", args.day)
          .eq("mealType", args.mealType)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getGroceryList = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("groceryLists")
      .withIndex("by_week", (q) => q.eq("weekStart", args.weekStart))
      .first();
  },
});

export const setGroceryList = mutation({
  args: {
    weekStart: v.string(),
    items: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("groceryLists")
      .withIndex("by_week", (q) => q.eq("weekStart", args.weekStart))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { items: args.items, updatedAt: now });
    } else {
      await ctx.db.insert("groceryLists", {
        weekStart: args.weekStart,
        items: args.items,
        updatedAt: now,
      });
    }
  },
});

export const seedMeals = mutation({
  args: {},
  handler: async (ctx) => {
    const weekStart = "2026-02-23";
    const existing = await ctx.db
      .query("meals")
      .withIndex("by_week", (q) => q.eq("weekStart", weekStart))
      .first();
    if (existing) return "Already seeded";

    const now = Date.now();

    const mealData: Array<{
      day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
      mealType: "breakfast" | "lunch" | "dinner";
      name: string;
      sorenMeal?: string;
      notes?: string;
    }> = [
      { day: "Monday", mealType: "breakfast", name: "Overnight oats", sorenMeal: "Banana + oatmeal" },
      { day: "Monday", mealType: "lunch", name: "Turkey wraps", sorenMeal: "Avocado + puffs" },
      { day: "Monday", mealType: "dinner", name: "Sheet pan chicken thighs + roasted veggies", sorenMeal: "Shredded chicken + soft carrots" },
      { day: "Tuesday", mealType: "breakfast", name: "Eggs + toast", sorenMeal: "Scrambled egg yolk + soft fruit" },
      { day: "Tuesday", mealType: "lunch", name: "Leftover chicken + salad", sorenMeal: "Shredded chicken + puffs" },
      { day: "Tuesday", mealType: "dinner", name: "Pasta bolognese", sorenMeal: "Pasta pieces + meat sauce (no salt)", notes: "Use San Marzano tomatoes" },
      { day: "Wednesday", mealType: "breakfast", name: "Greek yogurt + granola", sorenMeal: "Yogurt + mashed blueberries" },
      { day: "Wednesday", mealType: "lunch", name: "Grain bowls", sorenMeal: "Quinoa + butternut squash" },
      { day: "Wednesday", mealType: "dinner", name: "Tacos", sorenMeal: "Soft tortilla + beans + avocado", notes: "Make guac fresh" },
      { day: "Thursday", mealType: "breakfast", name: "Smoothie bowls", sorenMeal: "Mashed banana + blueberries + whole milk" },
      { day: "Thursday", mealType: "lunch", name: "BLT sandwiches", sorenMeal: "Soft toast + avocado" },
      { day: "Thursday", mealType: "dinner", name: "Salmon + roasted broccoli + rice", sorenMeal: "Flaked salmon + steamed broccoli florets" },
      { day: "Friday", mealType: "breakfast", name: "Banana pancakes", sorenMeal: "Small pancake pieces + mashed banana" },
      { day: "Friday", mealType: "lunch", name: "Leftover salmon rice bowls", sorenMeal: "Leftover salmon + rice + avocado" },
      { day: "Friday", mealType: "dinner", name: "Homemade pizza", sorenMeal: "Soft pizza crust + mild cheese + soft veggie toppings", notes: "Friday pizza night 🍕" },
      { day: "Saturday", mealType: "breakfast", name: "Waffles + fresh fruit", sorenMeal: "Waffle pieces + soft strawberries" },
      { day: "Saturday", mealType: "lunch", name: "Grilled cheese + tomato soup", sorenMeal: "Soft bread + mild cheese + tomato soup (puréed)" },
      { day: "Saturday", mealType: "dinner", name: "Grilled burgers + sweet potato fries", sorenMeal: "Soft sweet potato + ground beef (mild)", notes: "Fire up the grill" },
      { day: "Sunday", mealType: "breakfast", name: "Avocado toast + poached eggs", sorenMeal: "Soft avocado + toast strips" },
      { day: "Sunday", mealType: "lunch", name: "Cobb salad", sorenMeal: "Shredded chicken + soft egg + avocado" },
      { day: "Sunday", mealType: "dinner", name: "Slow cooker chicken tikka masala + naan", sorenMeal: "Mild chicken + rice", notes: "Prep in morning, set & forget" },
    ];

    for (const meal of mealData) {
      await ctx.db.insert("meals", {
        weekStart,
        ...meal,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingGrocery = await ctx.db
      .query("groceryLists")
      .withIndex("by_week", (q) => q.eq("weekStart", weekStart))
      .first();

    if (!existingGrocery) {
      await ctx.db.insert("groceryLists", {
        weekStart,
        items: `Proteins: chicken thighs, ground beef, eggs, turkey deli meat, salmon fillets
Produce: bananas, avocado x4, blueberries, mixed greens, cherry tomatoes, butternut squash, bell peppers, broccoli, limes, strawberries, sweet potatoes
Dairy: Greek yogurt, shredded mozzarella, parmesan, butter, whole milk, cheddar slices
Pantry: pasta, crushed tomatoes, taco shells, black beans, quinoa, overnight oats, granola, olive oil, pizza dough, waffle mix, naan bread, rice
Baby: puffs (Gerber), Happy Baby pouches x6, soft teething crackers`,
        updatedAt: now,
      });
    }

    return "Meals seeded";
  },
});
