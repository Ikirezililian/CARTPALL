"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [userId, setUserId] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { signup, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!name || !userId) {
      setError("Please fill in all fields")
      return
    }

    try {
      const { success, error } = await signup(name, userId)

      if (success) {
        setSuccess(true)
        // Redirect to shopping list page after successful signup
        setTimeout(() => {
          router.push("/shopping-list")
        }, 1500)
      } else {
        setError(error || "Failed to create account. Please try again.")
      }
    } catch (err: any) {
      console.error("Signup error in component:", err)
      setError(err.message || "Failed to create account. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Sign Up</h1>

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

          {success && (
            <Alert className="mb-4 bg-green-100 border-green-200">
              <AlertDescription>
                Account created successfully! You'll be redirected to the app in a moment.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="name" className="block mb-2 text-gray-700">
                Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="userId" className="block mb-2 text-gray-700">
                User ID
              </label>
              <Input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Choose a unique User ID"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                This will be used to log in to your account. Choose something memorable.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
