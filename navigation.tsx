import Link from "next/link"
import { ShoppingCart, ShoppingBasket, FileText, Calendar, Settings } from "lucide-react"

export function Navigation() {
  return (
    <nav className="border-b border-gray-200 py-4 px-6 flex justify-between items-center bg-white">
      <Link href="/" className="flex items-center gap-2 text-green-500 font-bold text-2xl">
        <ShoppingCart className="h-6 w-6" />
        <span>CartPal</span>
      </Link>

      <div className="flex items-center gap-8">
        <Link href="/shopping-list" className="flex items-center gap-1 text-gray-600 hover:text-green-500">
          <ShoppingBasket className="h-5 w-5" />
          <span>Shopping List</span>
        </Link>

        <Link href="/recipes" className="flex items-center gap-1 text-gray-600 hover:text-green-500">
          <FileText className="h-5 w-5" />
          <span>Recipes</span>
        </Link>

        <Link href="/meal-plan" className="flex items-center gap-1 text-gray-600 hover:text-green-500">
          <Calendar className="h-5 w-5" />
          <span>Meal Plan</span>
        </Link>

        <Link href="/settings" className="flex items-center gap-1 text-gray-600 hover:text-green-500">
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  )
}
