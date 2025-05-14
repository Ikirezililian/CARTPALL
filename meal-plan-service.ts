import { supabase, type MealPlan, handleSupabaseError } from "@/lib/supabase"

export const MealPlanService = {
  // Get meal plans for a specific date range
  async getMealPlans(userId: string, startDate: string, endDate: string): Promise<MealPlan[]> {
    try {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })

      if (error) {
        throw error
      }

      return data as MealPlan[]
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Add a meal to the plan
  async addMeal(
    userId: string,
    date: string,
    mealType: "breakfast" | "lunch" | "dinner",
    note: string,
    recipeId?: string,
  ): Promise<MealPlan> {
    try {
      // Check if a meal of this type already exists for this date
      const { data: existingMeal, error: checkError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .eq("meal_type", mealType)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existingMeal) {
        // Update existing meal
        const { data, error } = await supabase
          .from("meal_plans")
          .update({
            note,
            recipe_id: recipeId || null,
          })
          .eq("id", existingMeal.id)
          .select()

        if (error) {
          throw error
        }

        return data[0] as MealPlan
      } else {
        // Create new meal
        const { data, error } = await supabase
          .from("meal_plans")
          .insert([
            {
              date,
              meal_type: mealType,
              note,
              recipe_id: recipeId || null,
              user_id: userId,
            },
          ])
          .select()

        if (error) {
          throw error
        }

        return data[0] as MealPlan
      }
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Delete a meal from the plan
  async deleteMeal(mealId: string): Promise<void> {
    try {
      const { error } = await supabase.from("meal_plans").delete().eq("id", mealId)

      if (error) {
        throw error
      }
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Subscribe to changes in meal plans
  subscribeMealPlans(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`meal_plans_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meal_plans",
          filter: `user_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe()
  },
}
