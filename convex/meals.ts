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
  score: number;
  notes?: string;
  ingredients: string[];
  servings: number;
};

const NYT_CANDIDATES: NytCandidate[] = [
  {
    name: "Sheet-Pan Chicken With Jammy Tomatoes and Pancetta",
    mealType: "dinner",
    url: "https://cooking.nytimes.com",
    score: 4.9,
    notes: "NYT Cooking family favorite",
    ingredients: ["Chicken thighs", "Cherry tomatoes", "Pancetta", "Garlic", "Olive oil"],
    servings: 4,
  },
  {
    name: "Caramelized Shallot Pasta",
    mealType: "dinner",
    url: "https://cooking.nytimes.com",
    score: 4.8,
    notes: "NYT Cooking reader favorite",
    ingredients: ["Pasta", "Shallots", "Tomato paste", "Parmesan", "Butter"],
    servings: 4,
  },
  {
    name: "Coconut Curry Salmon With Broccoli",
    mealType: "dinner",
    url: "https://cooking.nytimes.com",
    score: 4.7,
    notes: "NYT Cooking highly rated weeknight dinner",
    ingredients: ["Salmon", "Coconut milk", "Broccoli", "Ginger", "Lime"],
    servings: 4,
  },
  {
    name: "Lemony White Bean Soup With Turkey and Greens",
    mealType: "dinner",
    url: "https://cooking.nytimes.com",
    score: 4.7,
    notes: "NYT Cooking high-review comfort meal",
    ingredients: ["Ground turkey", "Cannellini beans", "Kale", "Lemon", "Onion"],
    servings: 4,
  },
  {
    name: "Gochujang Buttered Noodles",
    mealType: "lunch",
    url: "https://cooking.nytimes.com",
    score: 4.8,
    notes: "NYT Cooking quick lunch favorite",
    ingredients: ["Spaghetti", "Gochujang", "Butter", "Scallions", "Parmesan"],
    servings: 3,
  },
  {
    name: "Crispy Chickpea Salad Sandwiches",
    mealType: "lunch",
    url: "https://cooking.nytimes.com",
    score: 4.6,
    notes: "NYT Cooking vegetarian reader pick",
    ingredients: ["Chickpeas", "Greek yogurt", "Celery", "Lemon", "Sourdough bread"],
    servings: 4,
  },
  {
    name: "Lemony Chicken and Rice Soup",
    mealType: "lunch",
    url: "https://cooking.nytimes.com",
    score: 4.7,
    notes: "NYT Cooking staple lunch bowl",
    ingredients: ["Chicken breast", "Rice", "Carrots", "Celery", "Lemon"],
    servings: 4,
  },
  {
    name: "Fluffy Yogurt Pancakes",
    mealType: "breakfast",
    url: "https://cooking.nytimes.com",
    score: 4.7,
    notes: "NYT Cooking brunch favorite",
    ingredients: ["All-purpose flour", "Greek yogurt", "Eggs", "Baking powder", "Maple syrup"],
    servings: 4,
  },
  {
    name: "Baked Oatmeal With Blueberries",
    mealType: "breakfast",
    url: "https://cooking.nytimes.com",
    score: 4.6,
    notes: "NYT Cooking make-ahead breakfast",
    ingredients: ["Rolled oats", "Blueberries", "Milk", "Eggs", "Brown sugar"],
    servings: 6,
  },
  {
    name: "Soft Scrambled Eggs With Herbs",
    mealType: "breakfast",
    url: "https://cooking.nytimes.com",
    score: 4.5,
    notes: "NYT Cooking simple high-review classic",
    ingredients: ["Eggs", "Butter", "Chives", "Sourdough toast"],
    servings: 2,
  },
];

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
    .filter((candidate) => !excludedNames.has(normalize(candidate.name)))
    .sort((a, b) => b.score - a.score);
}

function replacementPayload(candidate: NytCandidate) {
  return {
    name: candidate.name,
    url: candidate.url,
    notes: `NYT Cooking pick · high-review proxy ${candidate.score.toFixed(1)}/5`,
  };
}

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

    const rankedCandidates = replacementsFor(meal.mealType as MealType, excludedNames);
    const next = rankedCandidates[0] ?? NYT_CANDIDATES.find((c) => c.mealType === meal.mealType);

    if (!next) {
      throw new Error("No replacement candidates available");
    }

    const additional = rankedCandidates
      .filter((candidate) => candidate.name !== next.name)
      .slice(0, 3)
      .map(replacementPayload);

    await ctx.db.patch(args.id, {
      name: next.name,
      url: next.url,
      notes: `NYT Cooking · ranked by high-review proxy ${next.score.toFixed(1)}/5${next.notes ? ` · ${next.notes}` : ""}`,
      ingredients: next.ingredients,
      servings: next.servings,
      status: "pending",
      replacements: additional,
      updatedAt: Date.now(),
    });

    return {
      id: args.id,
      name: next.name,
      score: next.score,
    };
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
