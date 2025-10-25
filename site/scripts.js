// Dummy data for suppliers
const suppliers = [
  {id:1, name:'Сладости ООО', region:'Москва', categories:['сахар', 'какао'], rating:4.5, description:'Поставщик сахара и какао.'},
  {id:2, name:'Масло-Сервис', region:'Санкт-Петербург', categories:['масло'], rating:4.0, description:'Поставки растительного масла.'},
  {id:3, name:'УпаковкаПлюс', region:'Казань', categories:['упаковка'], rating:4.2, description:'Решения по упаковке.'}
];

function renderCatalog(){
  const list=document.getElementById('supplierList');
  if(!list) return;
  list.innerHTML='';
  suppliers.forEach(s=>{
    const card=document.createElement('div');
    card.className='card';
    card.innerHTML=`<h3>${s.name}</h3><p>${s.region}</p><p>${s.categories.join(', ')}</p><p>Рейтинг: ${s.rating}</p><a href="supplier.html?id=${s.id}">Подробнее</a>`;
    list.appendChild(card);
  });
}

function renderSupplier(){
  const params=new URLSearchParams(window.location.search);
  const id=parseInt(params.get('id'));
  const supplier=suppliers.find(s=>s.id===id);
  if(!supplier) return;
  document.getElementById('supplierName').textContent=supplier.name;
  const details=document.getElementById('supplierDetails');
  details.innerHTML=`<p>${supplier.description}</p><p>Регион: ${supplier.region}</p><p>Категории: ${supplier.categories.join(', ')}</p><p>Рейтинг: ${supplier.rating}</p><p>Контакты: info@example.com</p>`;
}

function renderPrices(){
  const ctx=document.getElementById('priceChart');
  if(!ctx) return;
  const labels=['Янв','Фев','Мар','Апр','Май','Июн'];
  const data=labels.map(()=>Math.floor(Math.random()*100)+50);
  new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Сахар',data,borderColor:'blue'}]}});
}

document.addEventListener('DOMContentLoaded',()=>{
  renderCatalog();
  renderSupplier();
  renderPrices();
});
