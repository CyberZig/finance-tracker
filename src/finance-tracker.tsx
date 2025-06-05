import { useState, useEffect } from 'react'
import { Button } from "/components/ui/button"
import { Input } from "/components/ui/input"
import { Label } from "/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "/components/ui/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "/components/ui/table"
import { Home, List, Clock, PiggyBank, DollarSign, ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'

// GBP currency formatter
const formatGBP = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount)
}

type Transaction = {
  id: string
  date: string
  description: string
  originalAmount: number
  amountOwed: number // Amount someone owes you (reduces your final cost)
  finalAmount: number // originalAmount - amountOwed
  type: 'expense' | 'income'
  category: string
  owedBy?: string // Who owes you money for this transaction
}

type IncomeStream = {
  id: string
  month: string // YYYY-MM format
  source: string
  amount: number
  description: string
}

type RecurringPayment = {
  id: string
  description: string
  amount: number
  startDate: string
  endDate: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  dayOfMonth?: number
}

type Savings = {
  id: string
  month: string // YYYY-MM format
  amount: number
  description: string
}

export default function FinanceTracker() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'transactions' | 'recurring' | 'savings' | 'income'>('dashboard')
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  
  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>([])
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([])
  const [savings, setSavings] = useState<Savings[]>([])
  
  // Form states
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    originalAmount: '',
    amountOwed: '0',
    type: 'expense',
    category: 'Other',
    owedBy: ''
  })
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [incomeForm, setIncomeForm] = useState({
    source: '',
    amount: '',
    description: ''
  })
  const [recurringForm, setRecurringForm] = useState({
    description: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    frequency: 'monthly',
    dayOfMonth: new Date().getDate().toString()
  })
  const [savingsForm, setSavingsForm] = useState({
    amount: '',
    description: ''
  })

  // Load data from localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions')
    const savedIncome = localStorage.getItem('incomeStreams')
    const savedRecurring = localStorage.getItem('recurringPayments')
    const savedSavings = localStorage.getItem('savings')

    if (savedTransactions) setTransactions(JSON.parse(savedTransactions))
    if (savedIncome) setIncomeStreams(JSON.parse(savedIncome))
    if (savedRecurring) setRecurringPayments(JSON.parse(savedRecurring))
    if (savedSavings) setSavings(JSON.parse(savedSavings))
  }, [])

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions))
    localStorage.setItem('incomeStreams', JSON.stringify(incomeStreams))
    localStorage.setItem('recurringPayments', JSON.stringify(recurringPayments))
    localStorage.setItem('savings', JSON.stringify(savings))
  }, [transactions, incomeStreams, recurringPayments, savings])

  // Month navigation
  const nextMonth = () => {
    setCurrentMonth(format(addMonths(parseISO(`${currentMonth}-01`), 1), 'yyyy-MM'))
  }

  const prevMonth = () => {
    setCurrentMonth(format(subMonths(parseISO(`${currentMonth}-01`), 1), 'yyyy-MM'))
  }

  // Filter data by current month
  const currentMonthTransactions = transactions.filter(t => 
    t.date.startsWith(currentMonth)
  )

  const currentMonthIncome = incomeStreams.filter(i => 
    i.month === currentMonth
  )

  const currentMonthRecurring = recurringPayments.filter(r => {
    const startDate = parseISO(r.startDate)
    const endDate = r.endDate ? parseISO(r.endDate) : null
    const currentDate = parseISO(`${currentMonth}-01`)
    
    return (currentDate >= startDate) && (!endDate || currentDate <= endDate)
  })

  const currentMonthSavings = savings.find(s => s.month === currentMonth)

  // Calculate totals for dashboard
  const totalIncome = currentMonthIncome
    .reduce((sum, i) => sum + i.amount, 0)

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.finalAmount, 0)

  const recurringExpenses = currentMonthRecurring
    .reduce((sum, r) => sum + r.amount, 0)

  const totalSavings = currentMonthSavings?.amount || 0
  const balance = totalIncome - totalExpenses - recurringExpenses - totalSavings

  // Transaction handlers
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const originalAmount = parseFloat(transactionForm.originalAmount)
    const amountOwed = parseFloat(transactionForm.amountOwed) || 0
    const finalAmount = originalAmount - amountOwed

    const transactionData = {
      id: editingTransactionId || Date.now().toString(),
      date: transactionForm.date,
      description: transactionForm.description,
      originalAmount,
      amountOwed,
      finalAmount,
      type: transactionForm.type as 'expense' | 'income',
      category: transactionForm.category,
      owedBy: transactionForm.owedBy || undefined
    }

    if (editingTransactionId) {
      setTransactions(transactions.map(t => 
        t.id === editingTransactionId ? transactionData : t
      ))
      setEditingTransactionId(null)
    } else {
      setTransactions([transactionData, ...transactions])
    }

    resetTransactionForm()
  }

  const editTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id)
    if (transaction) {
      setTransactionForm({
        date: transaction.date,
        description: transaction.description,
        originalAmount: transaction.originalAmount.toString(),
        amountOwed: transaction.amountOwed.toString(),
        type: transaction.type,
        category: transaction.category,
        owedBy: transaction.owedBy || ''
      })
      setEditingTransactionId(id)
    }
  }

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id))
    if (editingTransactionId === id) {
      resetTransactionForm()
      setEditingTransactionId(null)
    }
  }

  const resetTransactionForm = () => {
    setTransactionForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      originalAmount: '',
      amountOwed: '0',
      type: 'expense',
      category: 'Other',
      owedBy: ''
    })
  }

  // Income handlers
  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newIncome: IncomeStream = {
      id: Date.now().toString(),
      month: currentMonth,
      source: incomeForm.source,
      amount: parseFloat(incomeForm.amount),
      description: incomeForm.description
    }
    
    setIncomeStreams([...incomeStreams, newIncome])
    setIncomeForm({
      source: '',
      amount: '',
      description: ''
    })
  }

  const deleteIncome = (id: string) => {
    setIncomeStreams(incomeStreams.filter(i => i.id !== id))
  }

  // Recurring payment handlers (same as before)
  const handleRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newRecurring: RecurringPayment = {
      id: Date.now().toString(),
      description: recurringForm.description,
      amount: parseFloat(recurringForm.amount),
      startDate: recurringForm.startDate,
      endDate: recurringForm.endDate || '2099-12-31',
      frequency: recurringForm.frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
      dayOfMonth: recurringForm.frequency === 'monthly' ? parseInt(recurringForm.dayOfMonth) : undefined
    }
    setRecurringPayments([...recurringPayments, newRecurring])
    setRecurringForm({
      description: '',
      amount: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      frequency: 'monthly',
      dayOfMonth: new Date().getDate().toString()
    })
  }

  const deleteRecurring = (id: string) => {
    setRecurringPayments(recurringPayments.filter(p => p.id !== id))
  }

  // Savings handlers (same as before)
  const handleSavingsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newSavings: Savings = {
      id: Date.now().toString(),
      month: currentMonth,
      amount: parseFloat(savingsForm.amount),
      description: savingsForm.description
    }
    
    setSavings([...savings.filter(s => s.month !== currentMonth), newSavings])
    setSavingsForm({
      amount: '',
      description: ''
    })
  }

  const deleteSavings = (id: string) => {
    setSavings(savings.filter(s => s.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Personal Finance Tracker</h1>
          <div className="flex items-center justify-between mt-2">
            <div className="flex space-x-2">
              <Button 
                variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentPage('dashboard')}
              >
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </Button>
              <Button 
                variant={currentPage === 'income' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentPage('income')}
              >
                <DollarSign className="mr-2 h-4 w-4" /> Income
              </Button>
              <Button 
                variant={currentPage === 'transactions' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentPage('transactions')}
              >
                <List className="mr-2 h-4 w-4" /> Transactions
              </Button>
              <Button 
                variant={currentPage === 'recurring' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentPage('recurring')}
              >
                <Clock className="mr-2 h-4 w-4" /> Recurring
              </Button>
              <Button 
                variant={currentPage === 'savings' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentPage('savings')}
              >
                <PiggyBank className="mr-2 h-4 w-4" /> Savings
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}
              </span>
              <Button variant="ghost" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Page */}
        {currentPage === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{formatGBP(totalIncome)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{formatGBP(totalExpenses)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recurring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{formatGBP(recurringExpenses)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">{formatGBP(totalSavings)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold text-center py-4 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatGBP(balance)}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentMonthTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No transactions this month</p>
                  ) : (
                    <div className="space-y-2">
                      {currentMonthTransactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex justify-between items-center p-2 border-b">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.date} • {transaction.category}
                              {transaction.owedBy && ` • Owed by ${transaction.owedBy}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'income' ? '+' : '-'}{formatGBP(transaction.finalAmount)}
                            </p>
                            {transaction.amountOwed > 0 && (
                              <p className="text-xs text-muted-foreground">
                                ({formatGBP(transaction.originalAmount)} - {formatGBP(transaction.amountOwed)})
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Income Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentMonthIncome.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No income recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {currentMonthIncome.map((income) => (
                          <div key={income.id} className="flex justify-between items-center p-2 border-b">
                            <div>
                              <p className="font-medium">{income.source}</p>
                              <p className="text-sm text-muted-foreground">{income.description}</p>
                            </div>
                            <p className="text-green-600">{formatGBP(income.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Recurring Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentMonthRecurring.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No recurring payments this month</p>
                    ) : (
                      <div className="space-y-2">
                        {currentMonthRecurring.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center p-2 border-b">
                            <div>
                              <p className="font-medium">{payment.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {payment.frequency} • {payment.dayOfMonth ? `Day ${payment.dayOfMonth}` : ''}
                              </p>
                            </div>
                            <p className="text-red-600">-{formatGBP(payment.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Income Page */}
        {currentPage === 'income' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Income for {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleIncomeSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="income-source">Source</Label>
                    <Input
                      id="income-source"
                      value={incomeForm.source}
                      onChange={(e) => setIncomeForm({...incomeForm, source: e.target.value})}
                      placeholder="Salary, Freelance, etc."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="income-amount">Amount (£)</Label>
                    <Input
                      id="income-amount"
                      type="number"
                      step="0.01"
                      value={incomeForm.amount}
                      onChange={(e) => setIncomeForm({...incomeForm, amount: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="income-description">Description</Label>
                    <Input
                      id="income-description"
                      value={incomeForm.description}
                      onChange={(e) => setIncomeForm({...incomeForm, description: e.target.value})}
                      placeholder="Additional details"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Income
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Income Sources for {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentMonthIncome.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No income recorded this month</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMonthIncome.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell>{income.source}</TableCell>
                          <TableCell>{income.description || '-'}</TableCell>
                          <TableCell className="text-green-600">{formatGBP(income.amount)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteIncome(income.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions Page */}
        {currentPage === 'transactions' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingTransactionId ? 'Edit Transaction' : 'Add Transaction'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={transactionForm.date}
                        onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={transactionForm.type}
                        onValueChange={(value) => setTransactionForm({...transactionForm, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                      placeholder="What was this for?"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="originalAmount">Original Amount (£)</Label>
                      <Input
                        id="originalAmount"
                        type="number"
                        step="0.01"
                        value={transactionForm.originalAmount}
                        onChange={(e) => setTransactionForm({...transactionForm, originalAmount: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="amountOwed">Amount Owed to You (£)</Label>
                      <Input
                        id="amountOwed"
                        type="number"
                        step="0.01"
                        value={transactionForm.amountOwed}
                        onChange={(e) => setTransactionForm({...transactionForm, amountOwed: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="owedBy">Owed By (Optional)</Label>
                      <Input
                        id="owedBy"
                        value={transactionForm.owedBy}
                        onChange={(e) => setTransactionForm({...transactionForm, owedBy: e.target.value})}
                        placeholder="Who owes you?"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={transactionForm.category}
                        onValueChange={(value) => setTransactionForm({...transactionForm, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Transport">Transport</SelectItem>
                          <SelectItem value="Housing">Housing</SelectItem>
                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" className="flex-1">
                      <Plus className="mr-2 h-4 w-4" /> 
                      {editingTransactionId ? 'Update' : 'Add'} Transaction
                    </Button>
                    {editingTransactionId && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditingTransactionId(null)
                          resetTransactionForm()
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transactions for {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentMonthTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No transactions this month</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Owed By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMonthTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            <div>
                              {transaction.type === 'income' ? '+' : '-'}{formatGBP(transaction.finalAmount)}
                              {transaction.amountOwed > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  ({formatGBP(transaction.originalAmount)} - {formatGBP(transaction.amountOwed)})
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{transaction.owedBy || '-'}</TableCell>
                          <TableCell className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editTransaction(transaction.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTransaction(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recurring Payments Page */}
        {currentPage === 'recurring' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Recurring Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecurringSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recurring-start">Start Date</Label>
                      <Input
                        id="recurring-start"
                        type="date"
                        value={recurringForm.startDate}
                        onChange={(e) => setRecurringForm({...recurringForm, startDate: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="recurring-end">End Date (optional)</Label>
                      <Input
                        id="recurring-end"
                        type="date"
                        value={recurringForm.endDate}
                        onChange={(e) => setRecurringForm({...recurringForm, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recurring-amount">Amount (£)</Label>
                      <Input
                        id="recurring-amount"
                        type="number"
                        step="0.01"
                        value={recurringForm.amount}
                        onChange={(e) => setRecurringForm({...recurringForm, amount: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="recurring-frequency">Frequency</Label>
                      <Select
                        value={recurringForm.frequency}
                        onValueChange={(value) => setRecurringForm({...recurringForm, frequency: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {recurringForm.frequency === 'monthly' && (
                    <div>
                      <Label htmlFor="dayOfMonth">Day of Month</Label>
                      <Input
                        id="dayOfMonth"
                        type="number"
                        min="1"
                        max="31"
                        value={recurringForm.dayOfMonth}
                        onChange={(e) => setRecurringForm({...recurringForm, dayOfMonth: e.target.value})}
                        placeholder="Day of month (1-31)"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="recurring-description">Description</Label>
                    <Input
                      id="recurring-description"
                      value={recurringForm.description}
                      onChange={(e) => setRecurringForm({...recurringForm, description: e.target.value})}
                      placeholder="What's this recurring payment for?"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Recurring Payment
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recurring Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {currentMonthRecurring.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recurring payments</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Day of Month</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMonthRecurring.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.description}</TableCell>
                          <TableCell className="text-red-600">-{formatGBP(payment.amount)}</TableCell>
                          <TableCell className="capitalize">{payment.frequency}</TableCell>
                          <TableCell>{payment.dayOfMonth || '-'}</TableCell>
                          <TableCell>
                            {format(parseISO(payment.startDate), 'MMM yyyy')} to{' '}
                            {payment.endDate ? format(parseISO(payment.endDate), 'MMM yyyy') : 'ongoing'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecurring(payment.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Savings Page */}
        {currentPage === 'savings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Savings for {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavingsSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="savings-amount">Amount (£)</Label>
                    <Input
                      id="savings-amount"
                      type="number"
                      step="0.01"
                      value={savingsForm.amount}
                      onChange={(e) => setSavingsForm({...savingsForm, amount: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="savings-description">Description</Label>
                    <Input
                      id="savings-description"
                      value={savingsForm.description}
                      onChange={(e) => setSavingsForm({...savingsForm, description: e.target.value})}
                      placeholder="What are you saving for?"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> {currentMonthSavings ? 'Update' : 'Add'} Savings
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Savings</CardTitle>
              </CardHeader>
              <CardContent>
                {currentMonthSavings ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{formatGBP(currentMonthSavings.amount)}</p>
                        <p className="text-muted-foreground">{currentMonthSavings.description || 'No description'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSavings(currentMonthSavings.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No savings recorded for this month</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
