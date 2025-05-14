import { supabase, type Recipe, type RecipeIngredient, handleSupabaseError } from "@/lib/supabase"

export const RecipeService = {
  // Get all recipes for a user
  async getRecipes(userId: string): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return data as Recipe[]
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Get a single recipe with its ingredients
  async getRecipe(recipeId: string): Promise<{ recipe: Recipe; ingredients: RecipeIngredient[] }> {
    try {
      // Get the recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", recipeId)
        .single()

      if (recipeError) {
        throw recipeError
      }

      // Get the ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("created_at", { ascending: true })

      if (ingredientsError) {
        throw ingredientsError
      }

      return {
        recipe: recipeData as Recipe,
        ingredients: ingredientsData as RecipeIngredient[],
      }
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Create a new recipe
  async createRecipe(
    userId: string,
    name: string,
    image: string,
    instructions: string,
    ingredients: string[],
    notes?: string,
  ): Promise<Recipe> {
    try {
      // Start a transaction
      const { data, error } = await supabase
        .from("recipes")
        .insert([
          {
            name,
            image,
            instructions,
            notes,
            user_id: userId,
          },
        ])
        .select()

      if (error) {
        throw error
      }

      const recipe = data[0] as Recipe

      // Add ingredients
      if (ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map((name) => ({
          recipe_id: recipe.id,
          name,
        }))

        const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(ingredientsToInsert)

        if (ingredientsError) {
          throw ingredientsError
        }
      }

      return recipe
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Update a recipe
  async updateRecipe(
    recipeId: string,
    updates: {
      name?: string
      image?: string
      instructions?: string
      notes?: string
      ingredients?: string[]
    },
  ): Promise<Recipe> {
    try {
      // Update the recipe
      const { name, image, instructions, notes, ingredients } = updates
      const recipeUpdates: any = {}

      if (name !== undefined) recipeUpdates.name = name
      if (image !== undefined) recipeUpdates.image = image
      if (instructions !== undefined) recipeUpdates.instructions = instructions
      if (notes !== undefined) recipeUpdates.notes = notes

      const { data, error } = await supabase.from("recipes").update(recipeUpdates).eq("id", recipeId).select()

      if (error) {
        throw error
      }

      // Update ingredients if provided
      if (ingredients !== undefined) {
        // Delete existing ingredients
        const { error: deleteError } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId)

        if (deleteError) {
          throw deleteError
        }

        // Add new ingredients
        if (ingredients.length > 0) {
          const ingredientsToInsert = ingredients.map((name) => ({
            recipe_id: recipeId,
            name,
          }))

          const { error: insertError } = await supabase.from("recipe_ingredients").insert(ingredientsToInsert)

          if (insertError) {
            throw insertError
          }
        }
      }

      return data[0] as Recipe
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Delete a recipe
  async deleteRecipe(recipeId: string): Promise<void> {
    try {
      // Delete ingredients first
      const { error: ingredientsError } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId)

      if (ingredientsError) {
        throw ingredientsError
      }

      // Delete the recipe
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId)

      if (error) {
        throw error
      }
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Upload a recipe image
  async uploadImage(file: File): Promise<string> {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `recipe-images/${fileName}`

      const { error } = await supabase.storage.from("cartpal-images").upload(filePath, file)

      if (error) {
        throw error
      }

      const { data } = supabase.storage.from("cartpal-images").getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },
}
