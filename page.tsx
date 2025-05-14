"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Share2, ChevronRight, Check, DollarSign, AlertCircle, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { ShoppingListService } from "@/services/shopping-list-service"
import type { ShoppingList, ShoppingItem } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"
import { Label } from "@/components/ui/label"
import { BudgetIndicator } from "@/components/budget-indicator"

export default function ShoppingListPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [activeList, setActiveList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newItem, setNewItem] = useState("")
  const [loading, setLoading] = useState(true)
  const [newListBudget, setNewListBudget] = useState<string>("")
  const [totalSpent, setTotalSpent] = useState<number>(0)
  const [itemPrice, setItemPrice] = useState<string>("")
  const [isEditingPrice, setIsEditingPrice] = useState<string | null>(null)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [updatedBudget, setUpdatedBudget] = useState<string>("")
  const [spentByList, setSpentByList] = useState<Record<string, number>>({})

  // Add this new function to calculate total spent locally
  const calculateLocalTotalSpent = (items: ShoppingItem[]) => {
    return items
      .filter((item) => item.checked && item.price !== null)
      .reduce((total, item) => total + (item.price || 0), 0)
  }

  // Add this function to fetch total spent for each list
  const fetchTotalSpentForLists = async () => {
    if (!lists.length) return

    const spentByList: Record<string, number> = {}

    for (const list of lists) {
      try {
        const spent = await ShoppingListService.getTotalSpent(list.id)
        spentByList[list.id] = spent
      } catch (error) {
        console.error(`Failed to fetch total spent for list ${list.id}:`, error)
      }
    }

    return spentByList
  }

  // Load shopping lists when user is available
  useEffect(() => {
    if (!user) return

    const fetchLists = async () => {
      try {
        const lists = await ShoppingListService.getLists(user.id)
        setLists(lists)
        setLoading(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load shopping lists",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchLists()
  }, [user, toast])

  // Load items when active list changes
  useEffect(() => {
    if (!activeList) {
      setItems([])
      return
    }

    const fetchItems = async () => {
      try {
        const items = await ShoppingListService.getItems(activeList.id)
        setItems(items)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load shopping list items",
          variant: "destructive",
        })
      }
    }

    fetchItems()

    // Subscribe to real-time updates
    const subscription = ShoppingListService.subscribeToList(activeList.id, (payload) => {
      if (payload.eventType === "INSERT") {
        setItems((prev) => [...prev, payload.new as ShoppingItem])
      } else if (payload.eventType === "UPDATE") {
        setItems((prev) => prev.map((item) => (item.id === payload.new.id ? (payload.new as ShoppingItem) : item)))
      } else if (payload.eventType === "DELETE") {
        setItems((prev) => prev.filter((item) => item.id !== payload.old.id))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [activeList, toast])

  useEffect(() => {
    if (!activeList || !items.length) return

    // Calculate total spent locally based on checked items with prices
    setTotalSpent(calculateLocalTotalSpent(items))
  }, [activeList, items])

  useEffect(() => {
    if (!lists.length) return

    const loadTotalSpent = async () => {
      const spent = await fetchTotalSpentForLists()
      if (spent) {
        setSpentByList(spent)
      }
    }

    loadTotalSpent()
  }, [lists])

  const createNewList = async () => {
    if (!user || !newListName.trim()) return

    try {
      const budget = newListBudget ? Number.parseFloat(newListBudget) : null
      const newList = await ShoppingListService.createList(user.id, newListName, budget)
      setLists([newList, ...lists])
      setNewListName("")
      setNewListBudget("")
      setIsAddingList(false)

      toast({
        title: "Success",
        description: "Shopping list created",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create shopping list",
        variant: "destructive",
      })
    }
  }

  const deleteList = async (id: string) => {
    try {
      await ShoppingListService.deleteList(id)
      setLists(lists.filter((list) => list.id !== id))

      if (activeList?.id === id) {
        setActiveList(null)
      }

      toast({
        title: "Success",
        description: "Shopping list deleted",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete shopping list",
        variant: "destructive",
      })
    }
  }

  const addItem = async () => {
    if (!activeList || !newItem.trim()) return

    try {
      // Create a temporary ID for optimistic UI update
      const tempId = uuidv4()

      // Add item to local state immediately for instant feedback
      const tempItem: ShoppingItem = {
        id: tempId,
        name: newItem,
        quantity: "1",
        checked: false,
        list_id: activeList.id,
        created_at: new Date().toISOString(),
      }

      setItems((prev) => [...prev, tempItem])
      setNewItem("")

      // Then send to the server
      const addedItem = await ShoppingListService.addItem(activeList.id, newItem)

      // Replace the temporary item with the real one from the server
      setItems((prev) => prev.map((item) => (item.id === tempId ? addedItem : item)))
    } catch (error) {
      // If there's an error, remove the temporary item
      setItems((prev) => prev.filter((item) => item.id !== uuidv4()))

      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      })
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      await ShoppingListService.deleteItem(itemId)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const toggleCheck = async (item: ShoppingItem) => {
    try {
      // Create a new item with toggled checked status for optimistic UI update
      const updatedItem = { ...item, checked: !item.checked }

      // Update the items array immediately for instant UI feedback
      setItems((prevItems) => prevItems.map((i) => (i.id === item.id ? updatedItem : i)))

      // Then send to the server
      await ShoppingListService.updateItem(item.id, { checked: !item.checked })
    } catch (error) {
      // If there's an error, revert the optimistic update
      setItems((prevItems) => prevItems.map((i) => (i.id === item.id ? item : i)))

      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      })
    }
  }

  const updateItemQuantity = async (itemId: string, quantity: string) => {
    try {
      await ShoppingListService.updateItem(itemId, { quantity })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item quantity",
        variant: "destructive",
      })
    }
  }

  const updateItemPrice = async (itemId: string, price: string) => {
    try {
      const priceValue = price ? Number.parseFloat(price) : null

      // Update the items array immediately for instant UI feedback
      setItems((prevItems) => prevItems.map((item) => (item.id === itemId ? { ...item, price: priceValue } : item)))

      // Then send to the server
      await ShoppingListService.updateItem(itemId, { price: priceValue })
      setIsEditingPrice(null)
      setItemPrice("")
    } catch (error) {
      // If there's an error, revert the optimistic update by refetching items
      if (activeList) {
        const items = await ShoppingListService.getItems(activeList.id)
        setItems(items)
      }

      toast({
        title: "Error",
        description: "Failed to update item price",
        variant: "destructive",
      })
    }
  }

  const updateBudget = async () => {
    if (!activeList) return

    try {
      const budget = updatedBudget ? Number.parseFloat(updatedBudget) : null
      const updatedList = await ShoppingListService.updateListBudget(activeList.id, budget)
      setActiveList(updatedList)
      setIsEditingBudget(false)
      setUpdatedBudget("")

      toast({
        title: "Success",
        description: "Budget updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      })
    }
  }

  const shareList = () => {
    // In a real app, this would generate a shareable link
    toast({
      title: "Coming Soon",
      description: "Sharing functionality will be available soon!",
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex justify-center">
        <p>Loading shopping lists...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {!activeList ? (
        // Lists overview
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Shopping Lists</h1>
            <Button onClick={() => setIsAddingList(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add List
            </Button>
          </div>

          {lists.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">You don't have any shopping lists yet.</p>
              <Button onClick={() => setIsAddingList(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First List
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <ul className="divide-y divide-gray-200">
                {lists.map((list) => (
                  <li key={list.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <button className="text-left w-full flex items-center" onClick={() => setActiveList(list)}>
                          <div className="w-full">
                            <h3 className="font-medium">{list.name}</h3>
                            <p className="text-sm text-gray-500">
                              Created {new Date(list.created_at).toLocaleDateString()}
                            </p>
                            {list.budget !== null && (
                              <BudgetIndicator budget={list.budget} spent={spentByList[list.id] || 0} />
                            )}
                          </div>
                          <ChevronRight className="ml-auto h-5 w-5 text-gray-400" />
                        </button>
                      </div>
                      <Button variant="ghost" size="icon" className="ml-2" onClick={() => deleteList(list.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        // Active list view
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Button variant="ghost" className="mr-2" onClick={() => setActiveList(null)}>
                Back
              </Button>
              <h1 className="text-2xl font-bold">{activeList.name}</h1>
              {activeList && (
                <div className="flex items-center gap-2 ml-4">
                  {activeList.budget !== null ? (
                    <>
                      <div className="text-sm text-gray-600">Budget: ${activeList.budget.toFixed(2)}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingBudget(true)
                          setUpdatedBudget(activeList.budget?.toString() || "")
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingBudget(true)}>
                      Add Budget
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={shareList}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {activeList && (
            <Dialog open={isEditingBudget} onOpenChange={setIsEditingBudget}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Update Budget</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="budget">Budget Amount</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="budget"
                        type="number"
                        min="0"
                        step="0.01"
                        value={updatedBudget}
                        onChange={(e) => setUpdatedBudget(e.target.value)}
                        placeholder="Enter budget amount"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditingBudget(false)}>
                    Cancel
                  </Button>
                  <Button onClick={updateBudget}>Update Budget</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {activeList && activeList.budget !== null && (
            <div className="mb-6 mt-2">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Budget Summary</h3>
                  <div
                    className={`text-sm font-medium ${totalSpent > (activeList.budget || 0) ? "text-red-500" : "text-green-500"}`}
                  >
                    ${totalSpent.toFixed(2)} / ${activeList.budget?.toFixed(2)}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${totalSpent > (activeList.budget || 0) ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(100, (totalSpent / (activeList.budget || 1)) * 100)}%` }}
                  ></div>
                </div>
                {totalSpent > (activeList.budget || 0) && (
                  <div className="flex items-center mt-2 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    You're ${(totalSpent - (activeList.budget || 0)).toFixed(2)} over budget
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Add an item..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              className="flex-1"
            />
            <Button onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow">
            {items.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No items in this list. Add some items above!</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {items.map((item) => (
                  <li key={item.id} className="p-4 flex items-center">
                    <button
                      onClick={() => toggleCheck(item)}
                      className={`h-5 w-5 rounded border mr-3 flex items-center justify-center ${
                        item.checked ? "bg-green-500 border-green-500" : "border-gray-300"
                      }`}
                    >
                      {item.checked && <Check className="h-3 w-3 text-white" />}
                    </button>

                    <div className="flex-1">
                      <div className={`${item.checked ? "line-through text-gray-400" : ""}`}>{item.name}</div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Select value={item.quantity} onValueChange={(value) => updateItemQuantity(item.id, value)}>
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="Qty" />
                        </SelectTrigger>
                        <SelectContent>
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((qty) => (
                            <SelectItem key={qty} value={qty}>
                              {qty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {item.checked ? (
                        isEditingPrice === item.id ? (
                          <div className="relative w-[100px]">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={itemPrice}
                              onChange={(e) => setItemPrice(e.target.value)}
                              placeholder="Price"
                              className="pl-10"
                              onKeyDown={(e) => e.key === "Enter" && updateItemPrice(item.id, itemPrice)}
                              onBlur={() => updateItemPrice(item.id, itemPrice)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-[100px] justify-start"
                            onClick={() => {
                              setIsEditingPrice(item.id)
                              setItemPrice(item.price?.toString() || "")
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                            {item.price ? `$${item.price.toFixed(2)}` : "Add price"}
                          </Button>
                        )
                      ) : null}

                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Shopping List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="block mb-2 text-sm font-medium">List Name</label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., Weekly Groceries"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Budget (Optional)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newListBudget}
                  onChange={(e) => setNewListBudget(e.target.value)}
                  placeholder="Enter budget amount"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddingList(false)}>
              Cancel
            </Button>
            <Button onClick={createNewList}>Create List</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
