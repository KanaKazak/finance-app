const expenseCategories = [
    "groceries",
    "utilities", 
    "transport",
    "medical supplies",
    "prepared food",
    "loans",
    "mortgage",
    "indulgences",
    "gifts",
    "entertainment",
    "other"
];
const incomeCategories = [
    "salary",
    "freelance",
    "investments",
    "loans",
    "other"
];

let budgets = {}; // this will hold the budgets for each category, loaded from localStorage
let balance = 0;  // this will change as we add transactions
let transactions = [];  // this will hold all the transactions we add
let expenseChart = null; // this will hold the Chart.js instance for expenses, so we can update it when transactions change
let incomeChart = null; // this will hold the Chart.js instance for income, so we can update it when transactions change

const summary = document.getElementById("summary");
const greeting = document.getElementById("greeting");
greeting.textContent = "Welcome to your finance tracker!";
const totalExpensesElement = document.getElementById("total-expenses");
const totalIncomeElement = document.getElementById("total-income");
const clearButton = document.getElementById("clear-button");
const categorySelect = document.getElementById("category-input");
const SaveButton = document.getElementById("save-button");
const monthSelect = document.getElementById("month-select");
monthSelect.value = new Date().toISOString().slice(0, 7); // set the month select to the current month by default
















// --- Category and budget helpers
// This function populates the category dropdown based on the selected transaction type (income or expense)
function populateCategoriesDropdown() {
    const selectedType = document.getElementById("type-input").value;
    categorySelect.innerHTML = "";
    const categories = selectedType === "expense" ? expenseCategories : incomeCategories;
    categories.forEach(function(category) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}
// This function populates the budget categories dropdown with all expense categories, since budgets are only set for expenses
function populateBudgetCategoriesDropdown() {
    const budgetCategorySelect = document.getElementById("budget-category-input");
    budgetCategorySelect.innerHTML = "";
    expenseCategories.forEach(function(category) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        budgetCategorySelect.appendChild(option);
    });
}
// This function renders the list of budgets and highlights any categories that are over budget
function renderBudgetList() {
    const budgetList = document.getElementById("budget-list");
    budgetList.innerHTML = "";
    for (const category in budgets) {
        const li = document.createElement("li");
        const totalSpent = getThisMonthExpensesByCategory()[category] || 0;
        li.textContent = `${category}: Budget ${budgets[category]} ₸, Spent ${totalSpent} ₸`;
        if (totalSpent > budgets[category]) {
            li.style.color = "red"; // highlight in red if over budget
        }
        budgetList.appendChild(li);
     }
}
// These functions calculate the total expenses and income for the selected month, grouped by category, which are used to render the charts
function getThisMonthExpensesByCategory() {
    const expensesByCategory = {};
    transactions.forEach(function(transaction) {
        if (transaction.type === "expense") {
            if (transaction.date.slice(0, 7) === monthSelect.value) {
                if (!expensesByCategory[transaction.category]) {
                    expensesByCategory[transaction.category] = 0;
                }
                expensesByCategory[transaction.category] += transaction.amount;
            }
        }
    });
    return expensesByCategory;
}
// This function calculates the total income for the selected month, grouped by category, which is used to render the income chart
function getThisMonthIncomesByCategory() {
    const incomesByCategory = {};
    transactions.forEach(function(transaction) {
        if (transaction.type === "income") {
            if (transaction.date.slice(0, 7) === monthSelect.value) {
                if (!incomesByCategory[transaction.category]) {
                    incomesByCategory[transaction.category] = 0;
                }
                incomesByCategory[transaction.category] += transaction.amount;
            }
        }
    });
    return incomesByCategory;
}

// --- Transaction calculation helpers
// These functions calculate the total expenses and income for the selected month, which are displayed in the summary section of the UI
function calculateTotalExpenses() {
    let totalExpensesElement = 0;
    transactions.forEach(function(transaction) {
        if (transaction.type === "expense" && transaction.date.slice(0, 7) === monthSelect.value) {
            totalExpensesElement += transaction.amount; // add the amount of the transaction to total expenses if it's an expense
        }
    });
    return totalExpensesElement;
}
// This function calculates the total income for the selected month, which is displayed in the summary section of the UI
function calculateTotalIncome() {
    let totalIncomeElement = 0;
    transactions.forEach(function(transaction) {
        if (transaction.type === "income" && transaction.date.slice(0, 7) === monthSelect.value) {
            totalIncomeElement += transaction.amount; // add the amount of the transaction to total income if it's an income
        }
    });
    return totalIncomeElement;
}
// These functions calculate the total expenses and income for the selected month, grouped by category, which are used to render the charts and check against budgets
function getExpensesByCategory() {
    const expensesByCategory = {};
    transactions.forEach(function(transaction) {
        if (transaction.type === "expense" && transaction.date.slice(0, 7) === monthSelect.value) {
            if (!expensesByCategory[transaction.category]) {
                expensesByCategory[transaction.category] = 0;
            }
            expensesByCategory[transaction.category] += transaction.amount;
        }
    });
    return expensesByCategory;
}
// This function calculates the total income for the selected month, grouped by category, which is used to render the income chart and check against budgets
function getIncomesByCategory() {
    const incomesByCategory = {};
    transactions.forEach(function(transaction) {
        if (transaction.type === "income" && transaction.date.slice(0, 7) === monthSelect.value) {
            if (!incomesByCategory[transaction.category]) {
                incomesByCategory[transaction.category] = 0;
            }
            incomesByCategory[transaction.category] += transaction.amount;
        }
    });
    return incomesByCategory;
}
// This function recalculates the balance based on the transactions for the selected month, which is displayed in the summary section of the UI
function recalculateBalance() {
    balance = 0;
    transactions.forEach(function(transaction) {
        if (transaction.type === "expense" && transaction.date.slice(0, 7) === monthSelect.value) {
            balance -= transaction.amount;  // subtract the amount of the transaction from the balance if it's an expense
        } else if (transaction.type === "income" && transaction.date.slice(0, 7) === monthSelect.value) {
            balance += transaction.amount;  // add the amount of the transaction to the balance if it's an income
        }
    });
}

// --- Rendering helpers
// This function renders the list of transactions for the selected month in the UI, including a delete button for each transaction
function renderTransactions() {
    const list = document.getElementById("transaction-list");
    list.innerHTML = "";  // clear once, before the loop
    transactions
        .filter(t => t.date.slice(0, 7) === monthSelect.value)
        .forEach(function(transaction) {
            const li = document.createElement("li");
                li.textContent = `${transaction.description}: ${transaction.amount} ₸, Type: ${transaction.type}, Category: ${transaction.category}, Date: ${new Date(transaction.date).toLocaleString()}`;
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.dataset.id = transaction.id;
                deleteBtn.addEventListener("click", async function() {
                    const id = this.dataset.id;
                    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                    transactions = transactions.filter(t => t.id !== Number(id));
                    recalculateBalance();
                    updateUI();
                });
                li.appendChild(deleteBtn);
                list.appendChild(li);
            });
        }                
// This function renders the expense chart for the selected month in the UI, using Chart.js to create a pie chart of expenses by category
function renderExpenseChart() {
    if (expenseChart) expenseChart.destroy();
    const ctx = document.getElementById("expense-chart").getContext("2d");
    const expensesByCategory = getThisMonthExpensesByCategory();
    const labels = Object.keys(expensesByCategory);
    const amounts = Object.values(expensesByCategory);
    expenseChart = new Chart(ctx, {
        type: "pie",
        data: { labels: labels, datasets: [{ data: amounts }] },
        options: { maintainAspectRatio: true, responsive: false }
    });
}
// This function renders the income chart for the selected month in the UI, using Chart.js to create a pie chart of income by category
function renderIncomeChart() {
    if (incomeChart) incomeChart.destroy();
    const ctx = document.getElementById("income-chart").getContext("2d");
    const incomesByCategory = getThisMonthIncomesByCategory();
    const labels = Object.keys(incomesByCategory);
    const amounts = Object.values(incomesByCategory);
    incomeChart = new Chart(ctx, {
        type: "pie",
        data: { labels: labels, datasets: [{ data: amounts }] },
        options: { maintainAspectRatio: true, responsive: false }
    });
}
//  This function updates the UI to reflect the current state of transactions, balance, and budgets, and is called whenever transactions are added, deleted, or when the month is changed
function updateUI() {
    summary.textContent = `Total balance: ${balance} ₸`;
    totalExpensesElement.textContent = `Total expenses: ${calculateTotalExpenses()} ₸`;
    totalIncomeElement.textContent = `Total income: ${calculateTotalIncome()} ₸`;
    renderTransactions(); // call the function to update the transaction list in the UI
    renderExpenseChart(); // call the function to update the expense chart in the UI
    renderIncomeChart(); // call the function to update the income chart in the UI
    renderBudgetList(); // call the function to update the budget list in the UI
}

// --- API helpers
// This function loads the budgets from the backend when the page is loaded, so that we can display them in the UI and check against them when adding transactions
async function loadBudgets() {
    const response = await fetch('/api/budgets');
    const savedBudgets = await response.json();
    budgets = savedBudgets;
}
// This function saves a new budget to the backend when the user sets a budget for a category, so that it can be loaded and displayed in the UI later
async function saveBudgets(category, amount) {
    await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, amount })
    });
}
// This function saves a new transaction to the backend when the user adds a transaction, so that it can be loaded and displayed in the UI later
async function saveTransactions(transaction) {
    const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
    });
    const result = await response.json();
    return result.id;  // server returns { id: lastInsertRowid }
}

// --- Page loading and initialization
// This function loads the transactions from the backend when the page is loaded, and then updates the UI to reflect the loaded transactions and recalculated balance
async function loadPage() {
    const authResponse = await fetch('/api/me');
    if (!authResponse.ok) {
        window.location.href = '/login.html';
        return;
    }    
    populateCategoriesDropdown(); // populate the categories dropdown when loading transactions
    populateBudgetCategoriesDropdown(); // populate the budget categories dropdown when loading transactions
    const response = await fetch('/api/transactions');
    transactions = await response.json();
    recalculateBalance(); // recalculate the balance for each transaction loaded from localStorage
    await loadBudgets(); // load budgets from localStorage when loading transactions
    updateUI(); // update the UI to reflect the loaded transactions and recalculated balance
}

// --- Event listeners
// This event listener updates the categories dropdown whenever the user changes the transaction type (income or expense), so that they can select the appropriate category for their transaction
document.getElementById("type-input").addEventListener("change", function() {
    populateCategoriesDropdown();
});
// This event listener saves a new budget when the user clicks the "Set Budget" button, and then updates the UI to reflect the new budget and check against it when displaying transactions
document.getElementById("set-budget-btn").addEventListener("click", async function() {
    const category = document.getElementById("budget-category-input").value;
    const amount = Number(document.getElementById("budget-amount-input").value);
    if (!category || amount <= 0) {
        alert("Please select a category and enter a valid amount.");
        return;
    }
    budgets[category] = amount;
    await saveBudgets(category, amount);
    updateUI();
});
// This event listener saves a new transaction when the user clicks the "Add Transaction" button, and then updates the UI to reflect the new transaction and recalculated balance
SaveButton.addEventListener("click", async function() {
    const amount = Number(document.getElementById("amount-input").value);
    const description = document.getElementById("description-input").value;
    const category = document.getElementById("category-input").value; // get the category of the transaction
    const type = document.getElementById("type-input").value; // get the type of transaction (income or expense)
    if (isNaN(amount) || amount <= 0 || description === "") {
        alert("Please enter valid values for all fields.");
        return; // exit the function if any input is invalid
    }
    const transaction = {
        description: description,
        amount: amount,
        type: type,
        category: category, // include the category in the transaction object
        date: new Date().toISOString() // include the date and time in the transaction object
    };
    const id = await saveTransactions(transaction); // save the transaction to the backend and get the ID
    transaction.id = id;
    transactions.push(transaction); // add the new transaction to the transactions array
    recalculateBalance();
    updateUI();
});
// This event listener clears all transactions when the user clicks the "Clear All Transactions" button, and then updates the UI to reflect the cleared transactions and reset balance
clearButton.addEventListener("click", async function() {
    if (confirm("Are you sure you want to clear all transactions?")) {
        await fetch('/api/transactions', { method: 'DELETE' });
        transactions = [];
        balance = 0;
        updateUI();
    }
});
// This event listener updates the UI whenever the user changes the selected month, so that they can view transactions, balance, and budgets for the selected month
monthSelect.addEventListener("change", function() {
    recalculateBalance();
    updateUI();
});
loadPage();