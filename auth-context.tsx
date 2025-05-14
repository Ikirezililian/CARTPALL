"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase, type User, authenticateWithUserId, createUser } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (name: string, userId: string) => Promise<{ success: boolean; error: string | null }>
  signup: (name: string, userId: string) => Promise<{ success: boolean; error: string | null }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check for user session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a user in localStorage
        const storedUser = localStorage.getItem("cartpal_user")

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (name: string, userId: string) => {
    setLoading(true)

    try {
      const { user: authUser, error } = await authenticateWithUserId(name, userId)

      if (error) {
        return { success: false, error }
      }

      if (!authUser) {
        return { success: false, error: "Invalid name or User ID" }
      }

      // Store user in state and localStorage
      setUser(authUser)
      localStorage.setItem("cartpal_user", JSON.stringify(authUser))

      return { success: true, error: null }
    } catch (error: any) {
      console.error("Login error:", error)
      return { success: false, error: error.message || "Failed to login" }
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name: string, userId: string) => {
    setLoading(true)

    try {
      const { user: newUser, error } = await createUser(name, userId)

      if (error) {
        return { success: false, error }
      }

      if (!newUser) {
        return { success: false, error: "Failed to create user" }
      }

      // Store user in state and localStorage
      setUser(newUser)
      localStorage.setItem("cartpal_user", JSON.stringify(newUser))

      return { success: true, error: null }
    } catch (error: any) {
      console.error("Signup error:", error)
      return { success: false, error: error.message || "Failed to sign up" }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Clear user from state and localStorage
      setUser(null)
      localStorage.removeItem("cartpal_user")
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return

    try {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (error) {
        throw error
      }

      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      localStorage.setItem("cartpal_user", JSON.stringify(updatedUser))
    } catch (error: any) {
      console.error("Error updating profile:", error)
      throw new Error(error.message || "Failed to update profile")
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
