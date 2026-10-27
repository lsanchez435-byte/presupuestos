const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const starterPurchases = [
  {id:1,name:'Cuaderno',category:'Estudio personal',price:12000,status:'Pendiente'},
  {id:2,name:'Productos de aseo',category:'Estudio personal',price:35000,status:'Comprado'},
  {id:3,name:'Almuerzo',category:'Alimentación',price:15000,status:'Comprado'},
  {id:4,name:'Transporte',category:'Transporte',price:18000,status:'Pendiente'},
  {id:5,name:'Ropa',category:'Ropa',price:50000,status:'Pendiente'}
];
let purchases = load('miPresupuestoCompras', starterPurchases);
let budget = Number(load('miPresupuestoLimite', 500000));
let toastTimer;

function load(key, fallback) {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
  catch { return fallback; }
}
function save() {
  localStorage.setItem('miPresupuestoCompras', JSON.stringify(purchases));
  localStorage.setItem('miPresupuestoLimite', JSON.stringify(budget));
}
function formatMoney(value) { return money.format(Number(value) || 0).replace(/\u00a0/g, ' '); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
function iconFor(category) {
  return ({'Estudio personal':'📚','Alimentación':'🍓','Transporte':'🚌','Ropa':'👚','Hogar':'🏡','Otros':'✨'})[category] || '🛍️';
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
function renderRows(targetId, list = purchases) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  tbody.innerHTML = list.map(item => `
    <tr>
      <td><div class="item-cell"><span class="item-icon">${iconFor(item.category)}</span><span>${escapeHtml(item.name)}</span></div></td>
      <td><span class="category-tag">${escapeHtml(item.category)}</span></td>
      <td class="price-cell">${formatMoney(item.price)}</td>
      <td><span class="status ${item.status === 'Comprado' ? 'bought' : 'pending'}">${item.status === 'Comprado' ? '✓ Comprado' : '◷ Pendiente'}</span></td>
      <td><div class="actions">
        <button class="icon-button" title="${item.status === 'Comprado' ? 'Marcar pendiente' : 'Marcar comprado'}" aria-label="Cambiar estado" data-action="toggle" data-id="${item.id}">✓</button>
        <button class="icon-button" title="Editar" aria-label="Editar compra" data-action="edit" data-id="${item.id}">✎</button>
        <button class="icon-button" title="Borrar" aria-label="Borrar compra" data-action="delete" data-id="${item.id}">⌫</button>
      </div></td>
    </tr>`).join('');
  const empty = document.getElementById('empty-state');
  if (targetId === 'purchase-table') {
    empty.classList.toggle('hidden', list.length > 0);
    tbody.closest('.table-wrap').classList.toggle('hidden', list.length === 0);
  }
}
function renderSummary() {
  const spent = purchases.filter(p => p.status === 'Comprado').reduce((sum,p) => sum + Number(p.price), 0);
  const pending = purchases.filter(p => p.status === 'Pendiente').reduce((sum,p) => sum + Number(p.price), 0);
  const percent = budget > 0 ? Math.round(spent / budget * 100) : 0;
  document.getElementById('budget-total').textContent = formatMoney(budget);
  document.getElementById('spent-total').textContent = formatMoney(spent);
  document.getElementById('pending-total').textContent = formatMoney(pending);
  document.getElementById('budget-percent').textContent = `${percent}% usado`;
  document.getElementById('progress-fill').style.width = `${Math.min(percent,100)}%`;
  document.getElementById('progress-caption').textContent = `${formatMoney(spent)} de ${formatMoney(budget)}`;
  document.getElementById('report-budget').textContent = formatMoney(budget);
  document.getElementById('report-spent').textContent = formatMoney(spent);
  document.getElementById('report-pending').textContent = formatMoney(pending);
  const totals = {};
  purchases.forEach(p => { totals[p.category] = (totals[p.category] || 0) + Number(p.price); });
  const max = Math.max(1, ...Object.values(totals));
  const breakdown = document.getElementById('category-breakdown');
  breakdown.innerHTML = Object.keys(totals).length ? Object.entries(totals).map(([cat,total]) =>
    `<div class="category-row"><span>${escapeHtml(cat)}</span><div class="bar"><span style="width:${total/max*100}%"></span></div><strong>${formatMoney(total)}</strong></div>`
  ).join('') : '<p class="subtitle">Todavía no hay gastos para mostrar.</p>';
  document.getElementById('budget-input').value = budget;
}
function renderAll() {
  renderRows('purchase-table');
  renderRows('purchase-table-2', filteredPurchases());
  renderSummary();
}
function filteredPurchases() {
  const query = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const status = document.getElementById('filter-status')?.value || 'todos';
  return purchases.filter(p => p.name.toLowerCase().includes(query) && (status === 'todos' || p.status === status));
}
function openModal(item = null) {
  const form = document.getElementById('purchase-form');
  form.reset();
  document.getElementById('purchase-id').value = item ? item.id : '';
  document.getElementById('modal-title').textContent = item ? 'Editar compra' : 'Agregar compra';
  document.getElementById('item-name').value = item ? item.name : '';
  document.getElementById('item-category').value = item ? item.category : 'Estudio personal';
  document.getElementById('item-price').value = item ? item.price : '';
  document.getElementById('item-status').value = item ? item.status : 'Pendiente';
  document.getElementById('purchase-modal').classList.remove('hidden');
  document.getElementById('item-name').focus();
}
function closeModal() { document.getElementById('purchase-modal').classList.add('hidden'); }
function switchView(view) {
  document.querySelectorAll('.view').forEach(section => section.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const titles = {inicio:'¡Hola! ♡', compras:'Mis compras', resumen:'Tu resumen', configuracion:'Configuración'};
  document.getElementById('page-title').textContent = titles[view] || 'Mi presupuesto';
}
document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
document.getElementById('show-form-button').addEventListener('click', () => openModal());
document.getElementById('show-form-button-2').addEventListener('click', () => openModal());
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-modal').addEventListener('click', closeModal);
document.getElementById('purchase-modal').addEventListener('click', event => { if (event.target.id === 'purchase-modal') closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

document.getElementById('purchase-form').addEventListener('submit', event => {
  event.preventDefault();
  const id = document.getElementById('purchase-id').value;
  const item = {
    id: id ? Number(id) : Date.now(),
    name: document.getElementById('item-name').value.trim(),
    category: document.getElementById('item-category').value,
    price: Number(document.getElementById('item-price').value),
    status: document.getElementById('item-status').value
  };
  if (!item.name || item.price < 0 || !Number.isFinite(item.price)) return showToast('Revisa el nombre y el precio.');
  if (id) {
    purchases = purchases.map(p => p.id === Number(id) ? item : p);
    showToast('Compra actualizada correctamente.');
  } else {
    purchases.unshift(item);
    showToast('¡Compra agregada correctamente!');
  }
  save(); renderAll(); closeModal();
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = Number(button.dataset.id);
  const item = purchases.find(p => p.id === id);
  if (!item) return;
  if (button.dataset.action === 'edit') openModal(item);
  if (button.dataset.action === 'toggle') {
    item.status = item.status === 'Comprado' ? 'Pendiente' : 'Comprado';
    save(); renderAll(); showToast('Estado de la compra actualizado.');
  }
  if (button.dataset.action === 'delete' && confirm(`¿Quieres borrar "${item.name}"?`)) {
    purchases = purchases.filter(p => p.id !== id);
    save(); renderAll(); showToast('Compra eliminada.');
  }
});
document.getElementById('search-input').addEventListener('input', () => renderRows('purchase-table-2', filteredPurchases()));
document.getElementById('filter-status').addEventListener('change', () => renderRows('purchase-table-2', filteredPurchases()));
document.getElementById('budget-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = Number(document.getElementById('budget-input').value);
  if (!Number.isFinite(value) || value < 0) return showToast('Escribe un presupuesto válido.');
  budget = value; save(); renderAll(); showToast('Presupuesto guardado.');
});
document.getElementById('today-label').textContent = new Date().toLocaleDateString('es-CO', {weekday:'long', day:'numeric', month:'long'}).toUpperCase();
renderAll();
