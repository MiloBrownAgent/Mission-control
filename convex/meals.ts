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
    await ctx.db.patch(args.id, { status: "approved", updatedAt: Date.now() });
  },
});

export const denyMeal = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "denied", updatedAt: Date.now() });
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
      // Monday
      { day: "Monday", mealType: "breakfast", name: "Overnight oats", sorenMeal: "Banana + oatmeal" },
      { day: "Monday", mealType: "lunch", name: "Turkey wraps", sorenMeal: "Avocado + puffs" },
      { day: "Monday", mealType: "dinner", name: "Sheet pan chicken thighs + roasted veggies", sorenMeal: "Shredded chicken + soft carrots" },
      // Tuesday
      { day: "Tuesday", mealType: "breakfast", name: "Eggs + toast", sorenMeal: "Scrambled egg yolk + soft fruit" },
      { day: "Tuesday", mealType: "lunch", name: "Leftover chicken + salad", sorenMeal: "Shredded chicken + puffs" },
      { day: "Tuesday", mealType: "dinner", name: "Pasta bolognese", sorenMeal: "Pasta pieces + meat sauce (no salt)", notes: "Use San Marzano tomatoes" },
      // Wednesday
      { day: "Wednesday", mealType: "breakfast", name: "Greek yogurt + granola", sorenMeal: "Yogurt + mashed blueberries" },
      { day: "Wednesday", mealType: "lunch", name: "Grain bowls", sorenMeal: "Quinoa + butternut squash" },
      { day: "Wednesday", mealType: "dinner", name: "Tacos", sorenMeal: "Soft tortilla + beans + avocado", notes: "Make guac fresh" },
      // Thursday
      { day: "Thursday", mealType: "breakfast", name: "Smoothie bowls", sorenMeal: "Mashed banana + blueberries + whole milk" },
      { day: "Thursday", mealType: "lunch", name: "BLT sandwiches", sorenMeal: "Soft toast + avocado" },
      { day: "Thursday", mealType: "dinner", name: "Salmon + roasted broccoli + rice", sorenMeal: "Flaked salmon + steamed broccoli florets" },
      // Friday
      { day: "Friday", mealType: "breakfast", name: "Banana pancakes", sorenMeal: "Small pancake pieces + mashed banana" },
      { day: "Friday", mealType: "lunch", name: "Leftover salmon rice bowls", sorenMeal: "Leftover salmon + rice + avocado" },
      { day: "Friday", mealType: "dinner", name: "Homemade pizza", sorenMeal: "Soft pizza crust + mild cheese + soft veggie toppings", notes: "Friday pizza night 🍕" },
      // Saturday
      { day: "Saturday", mealType: "breakfast", name: "Waffles + fresh fruit", sorenMeal: "Waffle pieces + soft strawberries" },
      { day: "Saturday", mealType: "lunch", name: "Grilled cheese + tomato soup", sorenMeal: "Soft bread + mild cheese + tomato soup (puréed)" },
      { day: "Saturday", mealType: "dinner", name: "Grilled burgers + sweet potato fries", sorenMeal: "Soft sweet potato + ground beef (mild)", notes: "Fire up the grill" },
      // Sunday
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

    // Seed grocery list
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
