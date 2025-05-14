import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle } from "lucide-react"

interface BudgetIndicatorProps {
  budget: number | null
  spent: number
}

export function BudgetIndicator({ budget, spent }: BudgetIndicatorProps) {
  if (budget === null) return null

  const percentage = Math.min(100, (spent / budget) * 100)
  const isOverBudget = spent > budget

  return (
    <div className="mt-1">
      <div className="flex justify-between items-center text-xs mb-1">
        <div className="flex items-center">
          {isOverBudget ? (
            <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
          ) : (
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
          )}
          <span className={isOverBudget ? "text-red-500" : "text-green-500"}>
            {isOverBudget ? "Over budget" : "Within budget"}
          </span>
        </div>
        <span>
          ${spent.toFixed(2)} / ${budget.toFixed(2)}
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-1.5"
        indicatorClassName={isOverBudget ? "bg-red-500" : "bg-green-500"}
      />
    </div>
  )
}
