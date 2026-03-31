let subscriptions = [];
let chart = null;
let pendingClear = false;

function loadData() {
    const saved = localStorage.getItem('sublocker_data');
    if (saved) {
        subscriptions = JSON.parse(saved);
    } else {
        subscriptions = [
            { id: Date.now() + 1, name: "Netflix", cost: 15.99, category: "Entertainment", billingDay: 5, reminderDays: 3 },
            { id: Date.now() + 2, name: "Spotify", cost: 9.99, category: "Music", billingDay: 10, reminderDays: 2 },
            { id: Date.now() + 3, name: "Gym Membership", cost: 49.99, category: "Health & Fitness", billingDay: 1, reminderDays: 3 },
            { id: Date.now() + 4, name: "Adobe Cloud", cost: 52.99, category: "Software", billingDay: 15, reminderDays: 5 }
        ];
    }
}

function saveData() {
    localStorage.setItem('sublocker_data', JSON.stringify(subscriptions));
}

function calculateAdvancedStats() {
    if (subscriptions.length === 0) return;
    
    const avg = subscriptions.reduce((s, sub) => s + sub.cost, 0) / subscriptions.length;
    document.getElementById('avgSubPrice').textContent = `$${avg.toFixed(2)}`;
    
    const categoryTotals = {};
    subscriptions.forEach(sub => {
        categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + sub.cost;
    });
    const topCategory = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0];
    document.getElementById('mostExpensiveCat').textContent = topCategory ? topCategory[0] : '-';
    
    const today = new Date();
    const upcoming = subscriptions.map(sub => {
        let paymentDate = new Date(today.getFullYear(), today.getMonth(), sub.billingDay);
        if (paymentDate < today) paymentDate = new Date(today.getFullYear(), today.getMonth() + 1, sub.billingDay);
        return { ...sub, paymentDate, daysUntil: Math.ceil((paymentDate - today) / (1000*60*60*24)) };
    }).filter(s => s.daysUntil >= 0).sort((a,b) => a.daysUntil - b.daysUntil);
    
    if (upcoming.length > 0) {
        document.getElementById('nextPaymentDate').textContent = `${upcoming[0].name} (${upcoming[0].daysUntil}d)`;
    } else {
        document.getElementById('nextPaymentDate').textContent = '-';
    }
    
    const total = subscriptions.reduce((s, sub) => s + sub.cost, 0);
    const savingsTip = total > 100 ? "You're spending over $100/month—consider auditing!" : "Great job keeping costs low!";
    document.getElementById('savingsTip').textContent = savingsTip;
}

function calculateStats() {
    const total = subscriptions.reduce((s, sub) => s + sub.cost, 0);
    const yearly = total * 12;
    const today = new Date().getDate();
    const dueSoon = subscriptions.filter(sub => {
        const daysUntil = sub.billingDay - today;
        return daysUntil >= 0 && daysUntil <= sub.reminderDays;
    }).length;
    
    document.getElementById('totalMonthly').textContent = `$${total.toFixed(2)}`;
    document.getElementById('activeCount').textContent = subscriptions.length;
    document.getElementById('dueSoonCount').textContent = dueSoon;
    document.getElementById('yearlyTotal').textContent = `$${yearly.toFixed(2)}`;
    
    calculateAdvancedStats();
    return { total, dueSoon };
}

function getUpcomingPayments() {
    const today = new Date();
    const upcoming = subscriptions.map(sub => {
        let paymentDate = new Date(today.getFullYear(), today.getMonth(), sub.billingDay);
        if (paymentDate < today) paymentDate = new Date(today.getFullYear(), today.getMonth() + 1, sub.billingDay);
        const daysUntil = Math.ceil((paymentDate - today) / (1000*60*60*24));
        return { ...sub, paymentDate, daysUntil };
    }).filter(sub => sub.daysUntil >= 0 && sub.daysUntil <= 14).sort((a,b) => a.daysUntil - b.daysUntil);
    return upcoming;
}

function renderSubscriptions() {
    const container = document.getElementById('subscriptionsList');
    if (subscriptions.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><p>No subscriptions yet. Add your first one!</p></div>`;
        return;
    }
    container.innerHTML = subscriptions.map(sub => `
        <div class="subscription-item">
            <div class="subscription-header">
                <div class="subscription-name">
                    <i class="fas fa-lock" style="color: var(--primary);"></i>
                    ${escapeHtml(sub.name)}
                    <span class="category-badge">${escapeHtml(sub.category)}</span>
                </div>
                <div class="subscription-actions">
                    <button class="icon-btn" onclick="editSubscription(${sub.id})"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn" onclick="deleteSubscription(${sub.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="subscription-details">
                <div class="price">$${sub.cost.toFixed(2)}<span style="font-size:0.75rem;">/mo</span></div>
                <div>📅 Billing day ${sub.billingDay}</div>
                ${getReminderBadge(sub)}
            </div>
        </div>
    `).join('');
    calculateStats();
}

function getReminderBadge(sub) {
    const today = new Date().getDate();
    const daysUntil = sub.billingDay - today;
    if (daysUntil >= 0 && daysUntil <= sub.reminderDays) {
        return `<span class="reminder-badge"><i class="fas fa-bell"></i> Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}</span>`;
    }
    return '';
}

function renderUpcomingPayments() {
    const upcoming = getUpcomingPayments();
    const container = document.getElementById('upcomingPayments');
    if (upcoming.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>No upcoming payments in the next 14 days</p></div>`;
        return;
    }
    container.innerHTML = upcoming.map(p => `
        <div class="subscription-item">
            <div class="subscription-header">
                <div class="subscription-name">
                    <i class="fas fa-calendar-alt"></i> ${escapeHtml(p.name)}
                    <span class="category-badge">${escapeHtml(p.category)}</span>
                </div>
                <div class="price">$${p.cost.toFixed(2)}</div>
            </div>
            <div class="subscription-details">
                <div>📅 ${p.paymentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
                <span class="reminder-badge">${p.daysUntil === 0 ? 'Due today!' : `In ${p.daysUntil} days`}</span>
            </div>
        </div>
    `).join('');
}

function renderCategorySummary() {
    const categories = {};
    subscriptions.forEach(sub => {
        categories[sub.category] = (categories[sub.category] || 0) + sub.cost;
    });
    updateChart(categories);
}

function updateChart(categoriesData) {
    const ctx = document.getElementById('spendingChart').getContext('2d');
    const categories = Object.keys(categoriesData);
    const amounts = Object.values(categoriesData);
    if (chart) chart.destroy();
    if (categories.length === 0) return;
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec489a', '#6b7280'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-primary'), font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `$${ctx.raw.toFixed(2)} (${((ctx.raw / amounts.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } }
            }
        }
    });
}

function addSubscription(e) {
    e.preventDefault();
    const name = document.getElementById('serviceName').value.trim();
    const cost = parseFloat(document.getElementById('cost').value);
    const category = document.getElementById('category').value;
    const billingDay = parseInt(document.getElementById('billingDay').value);
    const reminderDays = parseInt(document.getElementById('reminderDays').value);
    const editId = document.getElementById('editId').value;
    if (!name || isNaN(cost) || cost <= 0) { showToast('Please fill all required fields', 'error'); return; }
    if (editId) {
        const index = subscriptions.findIndex(s => s.id == editId);
        if (index !== -1) subscriptions[index] = { ...subscriptions[index], name, cost, category, billingDay, reminderDays };
        showToast('Subscription updated!', 'success');
        document.getElementById('editId').value = '';
        document.getElementById('cancelEditBtn').style.display = 'none';
    } else {
        subscriptions.push({ id: Date.now(), name, cost, category, billingDay, reminderDays });
        showToast('Subscription added!', 'success');
    }
    document.getElementById('subscriptionForm').reset();
    saveData();
    renderAll();
}

function editSubscription(id) {
    const sub = subscriptions.find(s => s.id === id);
    if (sub) {
        document.getElementById('serviceName').value = sub.name;
        document.getElementById('cost').value = sub.cost;
        document.getElementById('category').value = sub.category;
        document.getElementById('billingDay').value = sub.billingDay;
        document.getElementById('reminderDays').value = sub.reminderDays;
        document.getElementById('editId').value = sub.id;
        document.getElementById('cancelEditBtn').style.display = 'inline-flex';
        showToast('Editing mode - make changes and save', 'info');
    }
}

function deleteSubscription(id) {
    if (confirm('Delete this subscription?')) {
        subscriptions = subscriptions.filter(s => s.id !== id);
        saveData();
        renderAll();
        showToast('Subscription deleted', 'success');
    }
}

function cancelEdit() {
    document.getElementById('subscriptionForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('cancelEditBtn').style.display = 'none';
    showToast('Edit cancelled', 'info');
}

function clearAll() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('active');
    pendingClear = true;
}

function confirmClear() {
    if (pendingClear) {
        subscriptions = [];
        saveData();
        renderAll();
        showToast('All subscriptions cleared', 'success');
        document.getElementById('confirmModal').classList.remove('active');
        pendingClear = false;
    }
}

function exportData() {
    const data = JSON.stringify(subscriptions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sublocker_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Data exported!', 'success');
}

function renderAll() {
    renderSubscriptions();
    renderUpcomingPayments();
    renderCategorySummary();
    calculateStats();
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'error' ? '⚠️' : type === 'warning' ? '⚠️' : '✅';
    toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${msg}`;
    toast.style.background = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

function initTheme() {
    const saved = localStorage.getItem('sublocker_theme') || 'light';
    document.body.className = saved;
    document.getElementById('themeToggleBtn').innerHTML = saved === 'dark' ? '<i class="fas fa-sun"></i> Light' : '<i class="fas fa-moon"></i> Dark';
}
function toggleTheme() {
    const newTheme = document.body.className === 'dark' ? 'light' : 'dark';
    document.body.className = newTheme;
    localStorage.setItem('sublocker_theme', newTheme);
    document.getElementById('themeToggleBtn').innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i> Light' : '<i class="fas fa-moon"></i> Dark';
    renderCategorySummary();
}

document.getElementById('subscriptionForm').addEventListener('submit', addSubscription);
document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
document.getElementById('clearAllBtn').addEventListener('click', clearAll);
document.getElementById('exportDataBtn').addEventListener('click', exportData);
document.getElementById('refreshRemindersBtn').addEventListener('click', renderUpcomingPayments);
document.getElementById('addSubscriptionBtn').addEventListener('click', () => { document.getElementById('subscriptionForm').reset(); document.getElementById('editId').value = ''; document.getElementById('cancelEditBtn').style.display = 'none'; });
document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
document.getElementById('confirmNo').addEventListener('click', () => document.getElementById('confirmModal').classList.remove('active'));
document.getElementById('confirmYes').addEventListener('click', confirmClear);

loadData();
renderAll();
initTheme();