 const STORAGE_KEY = 'shoe-log-v1.1';                                                               
                                                                                                      
   const shoeForm = document.getElementById('shoe-fo rm');                                            
   const runForm = document.getElementById('run-for m');                                              
   const runShoeSelect = document.getElementById('run-sho e');                                        
   const shoeList = document.getElementById('shoe-li st');                                            
   const runList = document.getElementById('run-lis t');                                              
   const statusEl = document.getElementById('status' );                                               
   const exportBtn = document.getElementById('export- btn');                                          
   const importBtn = document.getElementById('import- btn');                                          
   const importFileInput = document.getElementById('import- file');                                   
                                                                                                      
   const today = new Date().toISOString().slice(0, 10);                                               
   runForm.elements.date.value = today;                                                               
                                                                                                      
   let state = loadState();                                                                           
   render();                                                                                          
                                                                                                      
   function loadState() {                                                                             
   try {                                                                                              
   const raw = localStorage.getItem(STORAGE_KEY );                                                    
   if (!raw) return { schemaVersion: 1, shoes: [], runs: [] };                                        
   const parsed = JSON.parse(raw);                                                                    
   return {                                                                                           
   schemaVersion: parsed.schemaVersion || 1,                                                          
   shoes: Array.isArray(parsed.shoes) ? parsed.shoes : [],                                            
   runs: Array.isArray(parsed.runs) ? parsed.runs : []                                                
   };                                                                                                 
   } catch {                                                                                          
   return { schemaVersion: 1, shoes: [], runs: [] };                                                  
   }                                                                                                  
   }                                                                                                  
                                                                                                      
   function saveState() {                                                                             
   localStorage.setItem(STORAGE_KEY , JSON.stringify(state));                                         
   }                                                                                                  
                                                                                                      
   function id() {                                                                                    
   return Math.random().toString(36).slice (2, 10);                                                   
   }                                                                                                  
                                                                                                      
   function milesForShoe(shoeId) {                                                                    
   return state.runs.filter((r) => r.shoeId === shoeId).reduce((sum, r) => sum + Number(r.miles), 0); 
   }                                                                                                  
                                                                                                      
   function totalMiles(shoe) {                                                                        
   return Number(shoe.startMiles || 0) + milesForShoe(shoe.id);                                       
   }                                                                                                  
                                                                                                      
   function getTag(shoe, total) {                                                                     
   if (!shoe.retireAt) return { text: 'Active', cls: 'ok' };                                          
   const left = shoe.retireAt - total;                                                                
   if (left <= 0) return { text: 'Retire', cls: 'danger' };                                           
   if (left <= 50) return { text: `~${left.toFixed(1)} mi left`, cls: 'warn' };                       
   return { text: 'Active', cls: 'ok' };                                                              
   }                                                                                                  
                                                                                                      
   shoeForm.addEventListener('submi t', (e) => {                                                      
   e.preventDefault();                                                                                
   const form = new FormData(shoeForm);                                                               
   const name = String(form.get('name') || '').trim();                                                
   if (!name) return;                                                                                 
                                                                                                      
   state.shoes.unshift({                                                                              
   id: id(),                                                                                          
   name,                                                                                              
   model: String(form.get('model') || '').trim(),                                                     
   startMiles: Number(form.get('startMiles') || 0),                                                   
   retireAt: form.get('retireAt') ? Number(form.get('retireAt')) : null,                              
   createdAt: new Date().toISOString()                                                                
   });                                                                                                
                                                                                                      
   saveState();                                                                                       
   shoeForm.reset();                                                                                  
   setStatus('Shoe added.');                                                                          
   render();                                                                                          
   });                                                                                                
                                                                                                      
   runForm.addEventListener('submit ', (e) => {                                                       
   e.preventDefault();                                                                                
   if (!state.shoes.length) return setStatus('Add a shoe first.');                                    
                                                                                                      
   const form = new FormData(runForm);                                                                
   const shoeId = String(form.get('shoeId'));                                                         
   const miles = Number(form.get('miles'));                                                           
   const date = String(form.get('date'));                                                             
                                                                                                      
   if (!shoeId || !miles || miles <= 0 || !date) return setStatus('Enter valid run details.');        
                                                                                                      
   state.runs.unshift({ id: id(), shoeId, miles, date, createdAt: new Date().toISOString() });        
   saveState();                                                                                       
   runForm.reset();                                                                                   
   runForm.elements.date.value = today;                                                               
   setStatus('Run logged.');                                                                          
   render();                                                                                          
   });                                                                                                
                                                                                                      
   exportBtn.addEventListener('clic k', () => {                                                       
   const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });             
   const a = document.createElement('a');                                                             
   a.href = URL.createObjectURL(blob);                                                                
   a.download = `shoe-log-backup-${today}.json`;                                                      
   a.click();                                                                                         
   URL.revokeObjectURL(a.href);                                                                       
   setStatus('Backup exported.');                                                                     
   });                                                                                                
                                                                                                      
   importBtn.addEventListener('clic k', () => importFileInput.click());                               
                                                                                                      
   importFileInput.addEventListener ('change', async (e) => {                                         
   const file = e.target.files?.[0];                                                                  
   if (!file) return;                                                                                 
                                                                                                      
   try {                                                                                              
   const text = await file.text();                                                                    
   const parsed = JSON.parse(text);                                                                   
   if (!Array.isArray(parsed.shoes) || !Array.isArray(parsed.runs)) {                                 
   throw new Error('Invalid backup format.');                                                         
   }                                                                                                  
                                                                                                      
   if (!confirm('Replace current data with this backup?')) return;                                    
                                                                                                      
   state = {                                                                                          
   schemaVersion: parsed.schemaVersion || 1,                                                          
   shoes: parsed.shoes,                                                                               
   runs: parsed.runs                                                                                  
   };                                                                                                 
   saveState();                                                                                       
   setStatus('Backup imported.');                                                                     
   render();                                                                                          
   } catch (err) {                                                                                    
   setStatus(err.message || 'Import failed.');                                                        
   } finally {                                                                                        
   importFileInput.value = '';                                                                        
   }                                                                                                  
   });                                                                                                
                                                                                                      
   function setStatus(msg) {                                                                          
   statusEl.textContent = msg;                                                                        
   setTimeout(() => {                                                                                 
   if (statusEl.textContent === msg) statusEl.textContent = '';                                       
   }, 3000);                                                                                          
   }                                                                                                  
                                                                                                      
   function render() {                                                                                
   renderShoeSelect();                                                                                
   renderShoes();                                                                                     
   renderRuns();                                                                                      
   }                                                                                                  
                                                                                                      
   function renderShoeSelect() {                                                                      
   runShoeSelect.innerHTML = '';                                                                      
   if (!state.shoes.length) {                                                                         
   const opt = document.createElement('option') ;                                                     
   opt.value = '';                                                                                    
   opt.textContent = 'No shoes yet';                                                                  
   runShoeSelect.appendChild(opt);                                                                    
   runShoeSelect.disabled = true;                                                                     
   return;                                                                                            
   }                                                                                                  
                                                                                                      
   runShoeSelect.disabled = false;                                                                    
   const first = document.createElement('option') ;                                                   
   first.value = '';                                                                                  
   first.textContent = 'Select shoe';                                                                 
   runShoeSelect.appendChild(first) ;                                                                 
                                                                                                      
   state.shoes.forEach((shoe) => {                                                                    
   const opt = document.createElement('option') ;                                                     
   opt.value = shoe.id;                                                                               
   opt.textContent = shoe.model ? `${shoe.name} — ${shoe.model}` : shoe.name;                         
   runShoeSelect.appendChild(opt);                                                                    
   });                                                                                                
   }                                                                                                  
                                                                                                      
   function renderShoes() {                                                                           
   if (!state.shoes.length) {                                                                         
   shoeList.innerHTML = '<p class="empty">No shoes yet. Add your first shoe above.</p>';              
   return;                                                                                            
   }                                                                                                  
                                                                                                      
   shoeList.innerHTML = state.shoes.map((shoe) => {                                                   
   const total = totalMiles(shoe);                                                                    
   const tag = getTag(shoe, total);                                                                   
   const runMiles = milesForShoe(shoe.id);                                                            
   return `                                                                                           
   <article class="item">                                                                             
   <div class="row"><strong>${escapeHtml(shoe.name)}</strong><span class="tag                         
 ${tag.cls}">${tag.text}</span></div>                                                                 
   <div class="meta">${escapeHtml(shoe.m odel || 'No model')}</div>                                   
   <div class="meta">Total: ${total.toFixed(1)} mi • Logged: ${runMiles.toFixed(1)} mi • Start:       
 ${Number(shoe.startMiles || 0).toFixed(1)} mi</div>                                                  
   <div class="actions">                                                                              
   <button data-action="edit-shoe" data-id="${shoe.id}" class="btn-muted" type="button">Edit</button> 
   <button data-action="delete-shoe" data-id="${shoe.id}" class="btn-danger"                          
 type="button">Delete</button>                                                                        
   </div>                                                                                             
   </article>                                                                                         
   `;                                                                                                 
   }).join('');                                                                                       
   }                                                                                                  
                                                                                                      
   function renderRuns() {                                                                            
   if (!state.runs.length) {                                                                          
   runList.innerHTML = '<p class="empty">No runs logged yet. Log one above.</p>';                     
   return;                                                                                            
   }                                                                                                  
                                                                                                      
   runList.innerHTML = state.runs.slice(0, 30).map((run) => {                                         
   const shoe = state.shoes.find((s) => s.id === run.shoeId);                                         
   return `                                                                                           
   <article class="item">                                                                             
   <div class="row"><strong>${Number(run .miles).toFixed(1)}                                          
 mi</strong><span>${escapeHtml(run.date)}</span></div>                                                
   <div class="meta">${escapeHtml(shoe?. name || 'Unknown shoe')}</div>                               
   <div class="actions">                                                                              
   <button data-action="edit-run" data-id="${run.id}" class="btn-muted" type="button">Edit</button>   
   <button data-action="delete-run" data-id="${run.id}" class="btn-danger"                            
 type="button">Delete</button>                                                                        
   </div>                                                                                             
   </article>                                                                                         
   `;                                                                                                 
   }).join('');                                                                                       
   }                                                                                                  
                                                                                                      
   document.addEventListener('click ', (e) => {                                                       
   const target = e.target.closest('button[data-ac tion]');                                           
   if (!target) return;                                                                               
   const { action, id: targetId } = target.dataset;                                                   
                                                                                                      
   if (action === 'delete-run') return deleteRun(targetId);                                           
   if (action === 'edit-run') return editRun(targetId);                                               
   if (action === 'delete-shoe') return deleteShoe(targetId);                                         
   if (action === 'edit-shoe') return editShoe(targetId);                                             
   });                                                                                                
                                                                                                      
   function deleteRun(runId) {                                                                        
   if (!confirm('Delete this run?')) return;                                                          
   state.runs = state.runs.filter((r) => r.id !== runId);                                             
   saveState();                                                                                       
   setStatus('Run deleted.');                                                                         
   render();                                                                                          
   }                                                                                                  
                                                                                                      
   function editRun(runId) {                                                                          
   const run = state.runs.find((r) => r.id === runId);                                                
   if (!run) return;                                                                                  
                                                                                                      
   const miles = Number(prompt('Miles:', String(run.miles)));                                         
   if (!miles || miles <= 0) return setStatus('Invalid miles.');                                      
   const date = prompt('Date (YYYY-MM-DD):', run.date);                                               
   if (!date) return;                                                                                 
                                                                                                      
   run.miles = miles;                                                                                 
   run.date = date;                                                                                   
   saveState();                                                                                       
   setStatus('Run updated.');                                                                         
   render();                                                                                          
   }                                                                                                  
                                                                                                      
   function deleteShoe(shoeId) {                                                                      
   const shoe = state.shoes.find((s) => s.id === shoeId);                                             
   if (!shoe) return;                                                                                 
   if (!confirm(`Delete ${shoe.name}? Runs for this shoe will also be deleted.`)) return;             
                                                                                                      
   state.shoes = state.shoes.filter((s) => s.id !== shoeId);                                          
   state.runs = state.runs.filter((r) => r.shoeId !== shoeId);                                        
   saveState();                                                                                       
   setStatus('Shoe deleted.');                                                                        
   render();                                                                                          
   }                                                                                                  
                                                                                                      
   function editShoe(shoeId) {                                                                        
   const shoe = state.shoes.find((s) => s.id === shoeId);                                             
   if (!shoe) return;                                                                                 
                                                                                                      
   const name = prompt('Shoe name:', shoe.name);                                                      
   if (!name) return;                                                                                 
   const model = prompt('Brand / Model (optional):', shoe.model || '') ?? '';                         
   const retireRaw = prompt('Retire at miles (optional):', shoe.retireAt ?? '');                      
                                                                                                      
   shoe.name = name.trim();                                                                           
   shoe.model = model.trim();                                                                         
   shoe.retireAt = retireRaw ? Number(retireRaw) : null;                                              
                                                                                                      
   saveState();                                                                                       
   setStatus('Shoe updated.');                                                                        
   render();                                                                                          
   }                                                                                                  
                                                                                                      
   function escapeHtml(text) {                                                                        
   return String(text)                                                                                
   .replaceAll('&', '&amp;')                                                                          
   .replaceAll('<', '&lt;')                                                                           
   .replaceAll('>', '&gt;')                                                                           
   .replaceAll('"', '&quot;')                                                                         
   .replaceAll("'", '&#039;');                                                                        
   }                                
