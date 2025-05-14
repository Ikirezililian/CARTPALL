import { supabase, type ShoppingList, type ShoppingItem, handleSupabaseError } from "@/lib/supabase"

export const ShoppingListService = {
  // Get all shopping lists for a user
  async getLists(userId: string): Promise<ShoppingList[]> {
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return data as ShoppingList[]
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Create a new shopping list
  async createList(userId: string, name: string, budget?: number): Promise<ShoppingList> {
    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .insert([
          {
            name,
            user_id: userId,
            budget: budget || null,
          },
        ])
        .select()

      if (error) {
        throw error
      }

      return data[0] as ShoppingList
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Delete a shopping list
  async deleteList(listId: string): Promise<void> {
    try {
      // First delete all items in the list
      const { error: itemsError } = await supabase.from("shopping_items").delete().eq("list_id", listId)

      if (itemsError) {
        throw itemsError
      }

      // Then delete the list itself
      const { error } = await supabase.from("shopping_lists").delete().eq("id", listId)

      if (error) {
        throw error
      }
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Get all items in a shopping list
  async getItems(listId: string): Promise<ShoppingItem[]> {
    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: true })

      if (error) {
        throw error
      }

      return data as ShoppingItem[]
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Add an item to a shopping list
  async addItem(listId: string, name: string, quantity = "1"): Promise<ShoppingItem> {
    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .insert([
          {
            name,
            quantity,
            checked: false,
            list_id: listId,
          },
        ])
        .select()

      if (error) {
        throw error
      }

      return data[0] as ShoppingItem
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Update an item in a shopping list
  async updateItem(itemId: string, updates: Partial<ShoppingItem>): Promise<ShoppingItem> {
    try {
      const { data, error } = await supabase.from("shopping_items").update(updates).eq("id", itemId).select()

      if (error) {
        throw error
      }

      return data[0] as ShoppingItem
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Delete an item from a shopping list
  async deleteItem(itemId: string): Promise<void> {
    try {
      const { error } = await supabase.from("shopping_items").delete().eq("id", itemId)

      if (error) {
        throw error
      }
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Subscribe to changes in a shopping list
  subscribeToList(listId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`shopping_list_${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `list_id=eq.${listId}`,
        },
        callback,
      )
      .subscribe()
  },

  // Add a new function to get the total spent on a shopping list
  async getTotalSpent(listId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("price")
        .eq("list_id", listId)
        .eq("checked", true)
        .not("price", "is", null)

      if (error) {
        throw error
      }

      return data.reduce((total, item) => total + (item.price || 0), 0)
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },

  // Add a function to update the shopping list budget
  async updateListBudget(listId: string, budget: number | null): Promise<ShoppingList> {
    try {
      const { data, error } = await supabase.from("shopping_lists").update({ budget }).eq("id", listId).select()

      if (error) {
        throw error
      }

      return data[0] as ShoppingList
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  },
}
