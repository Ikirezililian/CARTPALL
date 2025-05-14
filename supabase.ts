import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://uyvuiyohacqldvjrulrj.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dnVpeW9oYWNxbGR2anJ1bHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NzMzNTksImV4cCI6MjA2MTM0OTM1OX0.374taEfOrG5I9GjER1xN1g0zUCiEIDEfp0mO7OYgdw8"

// Create a Supabase client with our URL and anonymous key
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export type User = {
  id: string
  name: string
  user_id: string
  created_at?: string
}

export type ShoppingList = {
  id: string
  name: string
  user_id: string
  created_at: string
  budget: number | null
}

export type ShoppingItem = {
  id: string
  name: string
  quantity: string
  checked: boolean
  list_id: string
  created_at: string
  price: number | null
}

export type Recipe = {
  id: string
  name: string
  image: string
  instructions: string
  notes?: string
  user_id: string
  created_at: string
}

export type RecipeIngredient = {
  id: string
  recipe_id: string
  name: string
  created_at: string
}

export type MealPlan = {
  id: string
  date: string
  meal_type: "breakfast" | "lunch" | "dinner"
  note: string
  recipe_id?: string
  user_id: string
  created_at: string
}

// Helper function to handle Supabase errors in a consistent way
export const handleSupabaseError = (error: any): string => {
  console.error("Supabase error:", error)
  return error.message || "An unexpected error occurred"
}

// Function to authenticate a user with their name and user_id
export const authenticateWithUserId = async (
  name: string,
  userId: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    // Check if the profile exists with this name and user_id
    const { data, error } = await supabase.from("profiles").select("*").eq("name", name).eq("user_id", userId).single()

    if (error) {
      // If no matching record is found, return a friendly error message
      if (error.code === "PGRST116") {
        return { user: null, error: "Invalid name or User ID. Please check your details and try again." }
      }
      throw error
    }

    if (!data) {
      return { user: null, error: "Invalid name or User ID. Please check your details and try again." }
    }

    // Return the user profile if authentication is successful
    return {
      user: {
        id: data.id,
        name: data.name,
        user_id: data.user_id,
      },
      error: null,
    }
  } catch (error: any) {
    console.error("Authentication error:", error)
    return { user: null, error: error.message || "Authentication failed" }
  }
}

// Function to create a new user in the database
export const createUser = async (
  name: string,
  userId: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    // First check if the user ID is already taken
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (existingUser) {
      return { user: null, error: "This User ID is already taken. Please choose another one." }
    }

    // Create a new profile in the database
    const { data, error } = await supabase
      .from("profiles")
      .insert([
        {
          name,
          user_id: userId,
        },
      ])
      .select()

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      return { user: null, error: "Failed to create user" }
    }

    // Return the newly created user
    return {
      user: {
        id: data[0].id,
        name: data[0].name,
        user_id: data[0].user_id,
      },
      error: null,
    }
  } catch (error: any) {
    console.error("Signup error:", error)
    return { user: null, error: error.message || "Failed to sign up" }
  }
}

// Function to get a user's profile by their ID
export const getUserProfile = async (id: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single()

    if (error) {
      throw error
    }

    return {
      id: data.id,
      name: data.name,
      user_id: data.user_id,
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

// Function to completely delete a user's account and all their data
export const deleteUserProfile = async (userId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Step 1: Delete the user's meal plans
    // We need to delete these first because they reference recipes
    const { error: mealPlansError } = await supabase.from("meal_plans").delete().eq("user_id", userId)

    if (mealPlansError) {
      throw mealPlansError
    }

    // Step 2: Get all recipes for the user so we can delete their ingredients
    // We need the recipe IDs to delete the ingredients that belong to them
    const { data: recipes, error: recipesError } = await supabase.from("recipes").select("id").eq("user_id", userId)

    if (recipesError) {
      throw recipesError
    }

    // Step 3: Delete recipe ingredients for all user recipes
    // We need to delete these before deleting the recipes themselves
    if (recipes && recipes.length > 0) {
      const recipeIds = recipes.map((recipe) => recipe.id)
      const { error: ingredientsError } = await supabase.from("recipe_ingredients").delete().in("recipe_id", recipeIds)

      if (ingredientsError) {
        throw ingredientsError
      }
    }

    // Step 4: Delete all recipes
    // Now that the ingredients are gone, we can delete the recipes
    const { error: recipesDeleteError } = await supabase.from("recipes").delete().eq("user_id", userId)

    if (recipesDeleteError) {
      throw recipesDeleteError
    }

    // Step 5: Get all shopping lists for the user so we can delete their items
    // Similar to recipes, we need the list IDs to delete the items in them
    const { data: lists, error: listsError } = await supabase.from("shopping_lists").select("id").eq("user_id", userId)

    if (listsError) {
      throw listsError
    }

    // Step 6: Delete shopping items for all user lists
    // We need to delete these before deleting the shopping lists themselves
    if (lists && lists.length > 0) {
      const listIds = lists.map((list) => list.id)
      const { error: itemsError } = await supabase.from("shopping_items").delete().in("list_id", listIds)

      if (itemsError) {
        throw itemsError
      }
    }

    // Step 7: Delete all shopping lists
    // Now that the items are gone, we can delete the lists
    const { error: listsDeleteError } = await supabase.from("shopping_lists").delete().eq("user_id", userId)

    if (listsDeleteError) {
      throw listsDeleteError
    }

    // Step 8: Finally, delete the user profile itself
    // This should be done last after all related data is removed
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      throw profileError
    }

    // If we got here, everything was deleted successfully
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Error deleting user profile:", error)
    return { success: false, error: error.message || "Failed to delete account" }
  }
}
