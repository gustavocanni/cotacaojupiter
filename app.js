import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
	import { 
	  getAuth, 
	  signInWithEmailAndPassword, 
	  signOut, 
	  createUserWithEmailAndPassword,
	  updatePassword,
	  sendPasswordResetEmail
	} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
	import { 
	  getFirestore, 
	  collection, 
	  addDoc, 
	  getDocs, 
	  doc, 
	  setDoc, 
	  getDoc,
	  updateDoc, 
	  onSnapshot 
	} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

	const firebaseConfig = {
	  apiKey: "AIzaSyB5UNfdl_3_UAujwagS4JlztjGbzoEYGL8",
	  authDomain: "cotacaojupiter.firebaseapp.com",
	  projectId: "cotacaojupiter",
	  storageBucket: "cotacaojupiter.firebasestorage.app",
	  messagingSenderId: "730752305049",
	  appId: "1:730752305049:web:4d0a1a81363998f394b508"
	};

	let app = initializeApp(firebaseConfig);
	let auth = getAuth(app);
	let db = getFirestore(app);

	let currentUser = null;
	let quotesList = [];
	let usersList = [];
	let currentSellerQuoteId = null;

	function updateStatusIndicator(isOnline, message) {
	  const dot = document.getElementById("status-dot");
	  const text = document.getElementById("status-text");
	  if (dot && text) {
		dot.className = `w-2 h-2 rounded-full inline-block ${isOnline ? 'bg-green-400' : 'bg-yellow-400'}`;
		text.innerText = message;
	  }
	}

	updateStatusIndicator(true, "Conectado ao Firebase Cloud");

	function showAlert(msg, isError = false) {
	  const banner = document.getElementById("alert-banner");
	  banner.className = `mb-4 p-4 rounded-lg text-sm font-medium transition-all shadow-sm ${isError ? 'bg-red-100 border border-red-200 text-red-800' : 'bg-green-100 border border-green-200 text-green-800'}`;
	  banner.innerText = msg;
	  banner.classList.remove("hidden");
	  setTimeout(() => banner.classList.add("hidden"), 5000);
	}

	// MÁSCARA TELEFONE
	window.maskPhone = function(input) {
	  let v = input.value.replace(/\D/g, "");
	  if (v.length > 11) v = v.substring(0, 11);
	  if (v.length > 6) {
		v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
	  } else if (v.length > 2) {
		v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
	  } else if (v.length > 0) {
		v = v.replace(/^(\d*)/, "($1");
	  }
	  input.value = v;
	};

	// CONTROLE DO MENU DROPDOWN DO USUÁRIO
	window.toggleUserDropdown = function() {
	  const menu = document.getElementById("user-dropdown-menu");
	  menu.classList.toggle("hidden");
	};

	// Fechar dropdown ao clicar fora
	window.addEventListener("click", function(e) {
	  const headerInfo = document.getElementById("user-info-header");
	  const menu = document.getElementById("user-dropdown-menu");
	  if (headerInfo && menu && !headerInfo.contains(e.target)) {
		menu.classList.add("hidden");
	  }
	});

	// ABRIR MODAL CONFIGURAÇÕES DA CONTA
	window.openAccountSettingsModal = function() {
	  document.getElementById("user-dropdown-menu").classList.add("hidden");
	  if (!currentUser) return;

	  document.getElementById("acc-name").value = currentUser.name || "";
	  document.getElementById("acc-company").value = currentUser.company || "";
	  document.getElementById("acc-email").value = currentUser.email || "";
	  document.getElementById("acc-phone").value = currentUser.phone || "";
	  document.getElementById("acc-password").value = "";

	  document.getElementById("modal-account-settings").classList.remove("hidden");
	  lucide.createIcons();
	};

	window.closeAccountSettingsModal = function() {
	  document.getElementById("modal-account-settings").classList.add("hidden");
	};

	// SALVAR CONFIGURAÇÕES DA CONTA
	window.saveAccountSettings = async function(e) {
	  e.preventDefault();
	  const name = document.getElementById("acc-name").value.trim();
	  const company = document.getElementById("acc-company").value.trim();
	  const phone = document.getElementById("acc-phone").value.trim();
	  const newPassword = document.getElementById("acc-password").value;

	  try {
		const userRef = doc(db, "users", currentUser.id);
		await updateDoc(userRef, {
		  name,
		  company,
		  phone,
		  updatedAt: new Date().toISOString()
		});

		if (newPassword && newPassword.length >= 6) {
		  const userAuth = auth.currentUser;
		  if (userAuth) {
			await updatePassword(userAuth, newPassword);
		  }
		}

		currentUser.name = name;
		currentUser.company = company;
		currentUser.phone = phone;
		localStorage.setItem("session_user", JSON.stringify(currentUser));

		document.getElementById("user-display-name").innerText = `${currentUser.name} (${currentUser.company})`;
		showAlert("Configurações da conta atualizadas com sucesso!");
		closeAccountSettingsModal();
	  } catch (err) {
		console.error("Erro ao atualizar conta:", err);
		showAlert("Erro ao atualizar conta: " + err.message, true);
	  }
	};

	// LOGIN
	window.handleLogin = async function(e) {
	  e.preventDefault();
	  const email = document.getElementById("login-email").value.trim().toLowerCase();
	  const password = document.getElementById("login-password").value;

	  try {
		const userCredential = await signInWithEmailAndPassword(auth, email, password);
		const uid = userCredential.user.uid;

		const docRef = doc(db, "users", uid);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
		  currentUser = docSnap.data();
		} else {
		  currentUser = {
			id: uid,
			email: userCredential.user.email,
			name: email.split('@')[0],
			role: 'admin',
			company: 'Supermercado Júpiter'
		  };
		}

		localStorage.setItem("session_user", JSON.stringify(currentUser));
		initUserSession();
		showAlert(`Bem-vindo(a), ${currentUser.name}!`);
	  } catch (err) {
		console.error("Erro no login:", err);
		showAlert("E-mail ou senha incorretos ou conta não existente.", true);
	  }
	};

	// LOGOUT
	window.logout = async function() {
	  await signOut(auth);
	  currentUser = null;
	  localStorage.removeItem("session_user");
	  document.getElementById("user-info-header").classList.add("hidden");
	  document.getElementById("admin-dashboard").classList.add("hidden");
	  document.getElementById("comprador-dashboard").classList.add("hidden");
	  document.getElementById("vendedor-dashboard").classList.add("hidden");
	  document.getElementById("auth-screen").classList.remove("hidden");
	};

	// INICIALIZAR PAINÉIS
	function initUserSession() {
	  if (!currentUser) return;

	  document.getElementById("auth-screen").classList.add("hidden");
	  const headerInfo = document.getElementById("user-info-header");
	  headerInfo.classList.remove("hidden");
	  headerInfo.classList.add("flex");

	  document.getElementById("user-display-name").innerText = `${currentUser.name} (${currentUser.company})`;
	  document.getElementById("user-display-role").innerText = currentUser.role;

	  if (currentUser.role === 'admin') {
		document.getElementById("admin-dashboard").classList.remove("hidden");
		document.getElementById("comprador-dashboard").classList.remove("hidden");
		document.getElementById("vendedor-dashboard").classList.add("hidden");
		listenUsersList();
	  } else if (currentUser.role === 'comprador') {
		document.getElementById("admin-dashboard").classList.add("hidden");
		document.getElementById("comprador-dashboard").classList.remove("hidden");
		document.getElementById("vendedor-dashboard").classList.add("hidden");
	  } else {
		document.getElementById("admin-dashboard").classList.add("hidden");
		document.getElementById("comprador-dashboard").classList.add("hidden");
		document.getElementById("vendedor-dashboard").classList.remove("hidden");
	  }

	  listenQuotes();
	}

	// CADASTRO ADMIN
	window.handleAdminUserRegistration = async function(e) {
	  e.preventDefault();

	  const role = document.getElementById("admin-reg-role").value;
	  const name = document.getElementById("admin-reg-name").value.trim();
	  const company = document.getElementById("admin-reg-company").value.trim();
	  const email = document.getElementById("admin-reg-email").value.trim().toLowerCase();
	  const password = document.getElementById("admin-reg-password").value;
	  const phone = document.getElementById("admin-reg-phone").value.trim();

	  try {
		const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
		const secondaryAuth = getAuth(secondaryApp);

		const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
		const newUid = userCredential.user.uid;

		const newUserData = {
		  id: newUid,
		  role,
		  name,
		  company,
		  email,
		  phone,
		  createdAt: new Date().toISOString()
		};

		await setDoc(doc(db, "users", newUid), newUserData);

		showAlert(`Usuário (${name}) cadastrado com sucesso!`);
		document.getElementById("admin-register-form").reset();
	  } catch (err) {
		console.error("Erro no cadastro pelo Admin:", err);
		let msg = err.message;
		if (err.code === 'auth/email-already-in-use') {
		  msg = "Este e-mail já está cadastrado no sistema.";
		}
		showAlert("Erro ao cadastrar usuário: " + msg, true);
	  }
	};

	function listenUsersList() {
	  onSnapshot(collection(db, "users"), (snapshot) => {
		usersList = [];
		snapshot.forEach((docSnap) => {
		  usersList.push(docSnap.data());
		});
		renderUsersList();
	  });
	}

	function renderUsersList() {
	  const tbody = document.getElementById("admin-users-list-body");
	  document.getElementById("admin-user-count").innerText = `${usersList.length} usuários`;

	  if (usersList.length === 0) {
		tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum usuário cadastrado.</td></tr>`;
		return;
	  }

	  tbody.innerHTML = usersList.map(u => `
		<tr class="hover:bg-gray-50">
		  <td class="p-3 font-semibold text-gray-800">${u.name}</td>
		  <td class="p-3 text-gray-600">${u.company}</td>
		  <td class="p-3 text-gray-600 font-mono text-xs">${u.email}</td>
		  <td class="p-3 text-gray-600">${u.phone}</td>
		  <td class="p-3 text-center">
			<span class="text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
			  u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
			  u.role === 'comprador' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
			}">${u.role}</span>
		  </td>
		  <td class="p-3 text-center">
			<button onclick="openEditUserModal('${u.id}')" class="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1">
			  <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Editar
			</button>
		  </td>
		</tr>
	  `).join('');
	  lucide.createIcons();
	}

	window.openEditUserModal = function(userId) {
	  const user = usersList.find(u => u.id === userId);
	  if (!user) return;

	  document.getElementById("edit-user-id").value = user.id;
	  document.getElementById("edit-user-role").value = user.role;
	  document.getElementById("edit-user-name").value = user.name;
	  document.getElementById("edit-user-company").value = user.company;
	  document.getElementById("edit-user-email").value = user.email;
	  document.getElementById("edit-user-phone").value = user.phone;

	  document.getElementById("modal-edit-user").classList.remove("hidden");
	  lucide.createIcons();
	};

	window.closeEditUserModal = function() {
	  document.getElementById("modal-edit-user").classList.add("hidden");
	};

	window.saveEditedUser = async function(e) {
	  e.preventDefault();
	  const userId = document.getElementById("edit-user-id").value;
	  const role = document.getElementById("edit-user-role").value;
	  const name = document.getElementById("edit-user-name").value.trim();
	  const company = document.getElementById("edit-user-company").value.trim();
	  const phone = document.getElementById("edit-user-phone").value.trim();

	  try {
		const userDocRef = doc(db, "users", userId);
		await updateDoc(userDocRef, { role, name, company, phone, updatedAt: new Date().toISOString() });
		showAlert("Dados do usuário atualizados com sucesso!");
		closeEditUserModal();
	  } catch (err) {
		console.error("Erro ao atualizar usuário:", err);
		showAlert("Erro ao atualizar usuário: " + err.message, true);
	  }
	};

	function listenQuotes() {
	  onSnapshot(collection(db, "quotes"), (snapshot) => {
		quotesList = [];
		snapshot.forEach((docSnap) => {
		  quotesList.push({ id: docSnap.id, ...docSnap.data() });
		});
		renderQuotes();
	  });
	}

	function renderQuotes() {
	  if (!currentUser) return;

	  if (currentUser.role === 'admin' || currentUser.role === 'comprador') {
		renderBuyerQuotes();
	  }
	  if (currentUser.role === 'vendedor') {
		renderSellerQuotes();
	  }
	}

	function isQuoteExpired(quote) {
	  if (quote.status === 'closed') return true;
	  if (!quote.deadline) return false;
	  return new Date(quote.deadline).getTime() < new Date().getTime();
	}

	function renderBuyerQuotes() {
	  const container = document.getElementById("buyer-quotes-list");
	  const myQuotes = currentUser.role === 'admin' ? quotesList : quotesList.filter(q => q.buyerId === currentUser.id || q.buyerEmail === currentUser.email);
	  document.getElementById("buyer-quote-count").innerText = `${myQuotes.length} cotações`;

	  if (myQuotes.length === 0) {
		container.innerHTML = `<div class="p-8 text-center text-gray-500">Nenhuma cotação cadastrada ainda.</div>`;
		return;
	  }

	  container.innerHTML = myQuotes.map(q => {
		const proposalCount = q.proposals ? Object.keys(q.proposals).length : 0;
		const expired = isQuoteExpired(q);
		const isClosed = q.status === 'closed' || expired;

		return `
		  <div class="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
			<div>
			  <div class="flex items-center gap-2">
				<h4 class="font-bold text-gray-800 text-base">${q.title}</h4>
				<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isClosed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
				  ${isClosed ? 'Fechada' : 'Aberta'}
				</span>
			  </div>
			  <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
				<span><i data-lucide="box" class="w-3.5 h-3.5 inline"></i> ${q.items.length} itens</span>
				<span><i data-lucide="calendar" class="w-3.5 h-3.5 inline"></i> Criada: ${new Date(q.createdAt).toLocaleDateString('pt-BR')}</span>
				${q.deadline ? `<span class="font-semibold text-orange-600"><i data-lucide="clock" class="w-3.5 h-3.5 inline"></i> Limite: ${new Date(q.deadline).toLocaleString('pt-BR')}</span>` : ''}
			  </div>
			</div>
			<div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
			  <span class="text-xs px-3 py-1 rounded-full font-semibold ${proposalCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}">
				${proposalCount} proposta(s)
			  </span>
			  <button onclick="viewProposals('${q.id}')" class="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg border border-blue-200 transition-colors flex items-center gap-1">
				<i data-lucide="eye" class="w-3.5 h-3.5"></i> ${isClosed ? 'Ver Resultado / Pedidos' : 'Gerenciar / Comparar'}
			  </button>
			</div>
		  </div>
		`;
	  }).join('');
	  lucide.createIcons();
	}

	// RENDERIZAR PAINEL DO VENDEDOR
	function renderSellerQuotes() {
	  const container = document.getElementById("seller-quotes-list");

	  if (quotesList.length === 0) {
		container.innerHTML = `<div class="p-8 text-center text-gray-500">Nenhuma cotação disponível no momento.</div>`;
		return;
	  }

	  container.innerHTML = quotesList.map(q => {
		const myProposal = q.proposals && q.proposals[currentUser.id];
		const expired = isQuoteExpired(q);
		const isClosed = q.status === 'closed' || expired;

		// Verifica se este vendedor ganhou algum item nesta cotação fechada
		let wonAnyItem = false;
		if (isClosed && myProposal) {
		  q.items.forEach(item => {
			let minPrice = Infinity;
			let winnerId = null;
			Object.values(q.proposals || {}).forEach(s => {
			  const p = s.itemsPrice ? s.itemsPrice[item.id] : 0;
			  if (p > 0 && p < minPrice) {
				minPrice = p;
				winnerId = s.sellerId;
			  }
			});
			if (winnerId === currentUser.id) wonAnyItem = true;
		  });
		}

		return `
		  <div class="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
			<div>
			  <div class="flex items-center gap-2">
				<span class="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${q.buyerCompany}</span>
				<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isClosed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
				  ${isClosed ? 'Encerrada' : 'Aberta'}
				</span>
			  </div>
			  <h4 class="font-bold text-gray-800 text-base mt-1">${q.title}</h4>
			  <div class="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
				<span>${q.items.length} produtos</span>
				${q.deadline ? `<span class="font-semibold text-orange-600">Limite: ${new Date(q.deadline).toLocaleString('pt-BR')}</span>` : ''}
			  </div>
			</div>
			<div class="flex items-center gap-2 flex-wrap">
			  ${isClosed ? `
				<button onclick="openSellerModal('${q.id}')" class="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-xs rounded-lg border flex items-center gap-1.5">
				  <i data-lucide="eye" class="w-4 h-4"></i> Ver Proposta Enviada
				</button>
				${wonAnyItem ? `
				  <button onclick="generateWinnerPDF('${q.id}', '${currentUser.id}')" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg shadow flex items-center gap-1.5">
					<i data-lucide="file-down" class="w-4 h-4"></i> Baixar PDF do Pedido
				  </button>
				` : ''}
			  ` : myProposal ? `
				<button onclick="openSellerModal('${q.id}')" class="px-4 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-semibold text-xs rounded-lg flex items-center gap-1.5">
				  <i data-lucide="check-circle" class="w-4 h-4"></i> Editar Proposta (R$ ${myProposal.total.toFixed(2)})
				</button>
			  ` : `
				<button onclick="openSellerModal('${q.id}')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg shadow transition-colors flex items-center gap-1.5">
				  <i data-lucide="edit-3" class="w-4 h-4"></i> Responder Cotação
				</button>
			  `}
			</div>
		  </div>
		`;
	  }).join('');
	  lucide.createIcons();
	};

	window.openNewQuoteModal = function() {
	  document.getElementById("quote-title").value = "";
	  const now = new Date();
	  now.setHours(now.getHours() + 48);
	  document.getElementById("quote-deadline").value = now.toISOString().slice(0, 16);
	  document.getElementById("new-quote-items-body").innerHTML = "";
	  addEmptyProductRow();
	  addEmptyProductRow();
	  document.getElementById("modal-new-quote").classList.remove("hidden");
	};

	window.closeNewQuoteModal = function() {
	  document.getElementById("modal-new-quote").classList.add("hidden");
	};

	window.addEmptyProductRow = function(code = '', name = '', qty = 1) {
	  const tbody = document.getElementById("new-quote-items-body");
	  const tr = document.createElement("tr");
	  tr.className = "quote-item-row";
	  tr.innerHTML = `
		<td class="p-2"><input type="text" value="${code}" class="item-code w-full p-1.5 border rounded text-xs" placeholder="Ex: 789..."></td>
		<td class="p-2"><input type="text" value="${name}" required class="item-name w-full p-1.5 border rounded text-xs" placeholder="Nome do produto"></td>
		<td class="p-2"><input type="number" min="1" value="${qty}" required class="item-qty w-full p-1.5 border rounded text-xs text-center"></td>
		<td class="p-2 text-center">
		  <button type="button" onclick="this.closest('tr').remove()" class="text-red-500 hover:text-red-700 p-1">
			<i data-lucide="trash-2" class="w-4 h-4"></i>
		  </button>
		</td>
	  `;
	  tbody.appendChild(tr);
	  lucide.createIcons();
	};

	window.importExcel = function(event) {
	  const file = event.target.files[0];
	  if (!file) return;

	  const reader = new FileReader();
	  reader.onload = function(e) {
		const data = new Uint8Array(e.target.result);
		const workbook = XLSX.read(data, { type: 'array' });
		const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
		const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

		if (jsonData.length < 2) {
		  showAlert("A planilha precisa ter um cabeçalho e produtos.", true);
		  return;
		}

		const tbody = document.getElementById("new-quote-items-body");
		tbody.innerHTML = "";

		const header = jsonData[0].map(h => String(h).toLowerCase().trim());
		let codeIdx = header.findIndex(h => h.includes("código") || h.includes("codigo") || h.includes("cod"));
		let nameIdx = header.findIndex(h => h.includes("nome") || h.includes("produto") || h.includes("desc"));
		let qtyIdx = header.findIndex(h => h.includes("qtd") || h.includes("quantidade"));

		if (nameIdx === -1) nameIdx = 1;
		if (codeIdx === -1) codeIdx = 0;
		if (qtyIdx === -1) qtyIdx = 2;

		let addedCount = 0;
		for (let i = 1; i < jsonData.length; i++) {
		  const row = jsonData[i];
		  if (!row || row.length === 0) continue;

		  const code = row[codeIdx] !== undefined ? String(row[codeIdx]) : '';
		  const name = row[nameIdx] !== undefined ? String(row[nameIdx]) : '';
		  const qty = row[qtyIdx] !== undefined ? parseInt(row[qtyIdx]) || 1 : 1;

		  if (name) {
			addEmptyProductRow(code, name, qty);
			addedCount++;
		  }
		}
		showAlert(`${addedCount} produtos importados com sucesso da planilha!`);
	  };
	  reader.readAsArrayBuffer(file);
	};

	window.saveNewQuote = async function() {
	  if (!currentUser) {
		const saved = localStorage.getItem("session_user");
		if (saved) currentUser = JSON.parse(saved);
	  }

	  if (!currentUser) {
		showAlert("Sessão expirada. Faça login novamente.", true);
		setTimeout(() => { logout(); }, 2000);
		return;
	  }

	  const title = document.getElementById("quote-title").value.trim();
	  const deadline = document.getElementById("quote-deadline").value;

	  if (!title || !deadline) {
		showAlert("Por favor, preencha o título e a data limite.", true);
		return;
	  }

	  const rows = document.querySelectorAll(".quote-item-row");
	  const items = [];

	  rows.forEach((tr, index) => {
		const code = tr.querySelector(".item-code").value.trim();
		const name = tr.querySelector(".item-name").value.trim();
		const qty = parseFloat(tr.querySelector(".item-qty").value) || 1;

		if (name) {
		  items.push({ id: 'item_' + index, code: code || `COD-${index+1}`, name, qty });
		}
	  });

	  if (items.length === 0) {
		showAlert("Adicione ao menos um produto válido.", true);
		return;
	  }

	  const newQuote = {
		title,
		deadline,
		status: 'open',
		buyerId: currentUser.id || 'admin_geral',
		buyerName: currentUser.name || 'Administrador',
		buyerCompany: currentUser.company || 'Supermercado Júpiter',
		buyerEmail: currentUser.email || 'admin@supermercado.com',
		items,
		proposals: {},
		createdAt: new Date().toISOString()
	  };

	  try {
		await addDoc(collection(db, "quotes"), newQuote);
		showAlert("Cotação salva e disponibilizada!");
		closeNewQuoteModal();
	  } catch (err) {
		console.error("Erro ao salvar cotação:", err);
		showAlert("Erro ao criar cotação: " + err.message, true);
	  }
	};

	// ABRIR MODAL VENDEDOR (COM BLOQUEIO SE ENCERRADA)
	window.openSellerModal = function(quoteId) {
	  currentSellerQuoteId = quoteId;
	  const quote = quotesList.find(q => q.id === quoteId);
	  if (!quote) return;

	  const expired = isQuoteExpired(quote);
	  const isClosed = quote.status === 'closed' || expired;

	  document.getElementById("seller-modal-quote-title").innerText = quote.title;
	  document.getElementById("seller-modal-quote-buyer").innerText = `Comprador: ${quote.buyerCompany} (${quote.buyerName})`;

	  const myProposal = quote.proposals && quote.proposals[currentUser.id];
	  document.getElementById("seller-payment-terms").value = myProposal ? myProposal.paymentTerms : "";

	  const notice = document.getElementById("seller-closed-notice");
	  const paymentInput = document.getElementById("seller-payment-terms");
	  const actionsContainer = document.getElementById("seller-modal-actions");

	  if (isClosed) {
		notice.classList.remove("hidden");
		paymentInput.setAttribute("disabled", "true");
		actionsContainer.innerHTML = `<button type="button" onclick="closeSellerModal()" class="px-5 py-2 bg-gray-700 text-white rounded-lg font-semibold text-sm">Fechar</button>`;
	  } else {
		notice.classList.add("hidden");
		paymentInput.removeAttribute("disabled");
		actionsContainer.innerHTML = `
		  <button type="button" onclick="closeSellerModal()" class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm">Cancelar</button>
		  <button type="button" onclick="submitSellerProposal()" class="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 shadow">
			<i data-lucide="send" class="w-4 h-4"></i> Enviar Proposta
		  </button>
		`;
	  }

	  const tbody = document.getElementById("seller-quote-items-body");
	  tbody.innerHTML = quote.items.map(item => {
		const prevPrice = (myProposal && myProposal.itemsPrice && myProposal.itemsPrice[item.id]) ? myProposal.itemsPrice[item.id] : "";
		return `
		  <tr class="seller-item-row" data-item-id="${item.id}" data-qty="${item.qty}">
			<td class="p-2.5 font-mono text-xs text-gray-500">${item.code}</td>
			<td class="p-2.5 font-medium text-gray-800">${item.name}</td>
			<td class="p-2.5 text-center font-bold">${item.qty}</td>
			<td class="p-2.5">
			  <input type="number" step="0.01" min="0" value="${prevPrice}" ${isClosed ? 'disabled' : ''} oninput="calculateSellerTotal()" class="seller-price-input w-full p-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:outline-none text-xs font-semibold ${isClosed ? 'bg-gray-100 text-gray-600' : ''}" placeholder="0,00">
			</td>
			<td class="p-2.5 text-right font-bold text-gray-700 seller-item-total">R$ 0,00</td>
		  </tr>
		`;
	  }).join('');

	  calculateSellerTotal();
	  document.getElementById("modal-seller-entry").classList.remove("hidden");
	  lucide.createIcons();
	};

	window.closeSellerModal = function() {
	  document.getElementById("modal-seller-entry").classList.add("hidden");
	};

	window.calculateSellerTotal = function() {
	  const rows = document.querySelectorAll(".seller-item-row");
	  let grandTotal = 0;

	  rows.forEach(tr => {
		const qty = parseFloat(tr.getAttribute("data-qty")) || 0;
		const priceInput = tr.querySelector(".seller-price-input");
		const price = parseFloat(priceInput.value) || 0;
		const itemTotal = qty * price;
		grandTotal += itemTotal;
		tr.querySelector(".seller-item-total").innerText = `R$ ${itemTotal.toFixed(2)}`;
	  });

	  document.getElementById("seller-modal-grand-total").innerText = `R$ ${grandTotal.toFixed(2)}`;
	};

	window.submitSellerProposal = async function() {
	  const paymentTerms = document.getElementById("seller-payment-terms").value.trim();
	  if (!paymentTerms) {
		showAlert("Informe o prazo de pagamento antes de enviar.", true);
		return;
	  }

	  const rows = document.querySelectorAll(".seller-item-row");
	  const itemsPrice = {};
	  let grandTotal = 0;

	  rows.forEach(tr => {
		const itemId = tr.getAttribute("data-item-id");
		const qty = parseFloat(tr.getAttribute("data-qty")) || 0;
		const price = parseFloat(tr.querySelector(".seller-price-input").value) || 0;
		itemsPrice[itemId] = price;
		grandTotal += (qty * price);
	  });

	  const proposal = {
		sellerId: currentUser.id,
		sellerName: currentUser.name,
		sellerCompany: currentUser.company,
		sellerPhone: currentUser.phone,
		sellerEmail: currentUser.email,
		paymentTerms,
		itemsPrice,
		total: grandTotal,
		updatedAt: new Date().toISOString()
	  };

	  const quote = quotesList.find(q => q.id === currentSellerQuoteId);

	  try {
		const docRef = doc(db, "quotes", currentSellerQuoteId);
		const updatedProposals = { ...(quote.proposals || {}), [currentUser.id]: proposal };
		await updateDoc(docRef, { proposals: updatedProposals });

		showAlert("Sua proposta foi salva e enviada ao comprador!");
		closeSellerModal();
	  } catch (err) {
		console.error("Erro ao enviar proposta:", err);
		showAlert("Erro ao salvar proposta: " + err.message, true);
	  }
	};

	window.closeQuoteManually = async function(quoteId) {
	  if (!confirm("Tem certeza que deseja fechar esta cotação agora?")) return;

	  try {
		const docRef = doc(db, "quotes", quoteId);
		await updateDoc(docRef, { status: 'closed', closedAt: new Date().toISOString() });
		showAlert("Cotação encerrada com sucesso!");
		closeProposalsModal();
	  } catch (err) {
		console.error("Erro ao fechar cotação:", err);
		showAlert("Erro ao fechar cotação: " + err.message, true);
	  }
	};

	// ACOMPANHAMENTO GLOBAL DOS VENCEDORES SELECIONADOS POR COTAÇÃO
	// Estrutura: { [quoteId]: { [itemId]: sellerId } }
	window.selectedWinnersMap = window.selectedWinnersMap || {};

	// ALTERAR VENCEDOR MANMENTE PELO RADIO BUTTON
	window.setManualWinner = function(quoteId, itemId, sellerId) {
	  if (!window.selectedWinnersMap[quoteId]) {
		window.selectedWinnersMap[quoteId] = {};
	  }
	  window.selectedWinnersMap[quoteId][itemId] = sellerId;
	  
	  // Atualiza a visualização do modal para recalcular totais e blocos de pedidos
	  viewProposals(quoteId);
	};

	// COMPARATIVO, DETECÇÃO DE ANOMALIAS E SELEÇÃO DE VENCEDORES
	window.viewProposals = function(quoteId) {
	  const quote = quotesList.find(q => q.id === quoteId);
	  if (!quote) return;

	  const expired = isQuoteExpired(quote);
	  const isClosed = quote.status === 'closed' || expired;

	  document.getElementById("view-modal-title").innerText = `Comparativo: ${quote.title}`;
	  document.getElementById("view-modal-subtitle").innerText = `Prazo Limite: ${new Date(quote.deadline).toLocaleString('pt-BR')}`;
	  
	  const badge = document.getElementById("view-modal-status-badge");
	  badge.className = `text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${isClosed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
	  badge.innerText = isClosed ? 'Cotação Encerrada' : 'Cotação Aberta';

	  const proposalsObj = quote.proposals || {};
	  const sellers = Object.values(proposalsObj);
	  const container = document.getElementById("proposals-modal-content");
	  const actionContainer = document.getElementById("close-quote-action-container");

	  if (!isClosed && (currentUser.role === 'admin' || currentUser.role === 'comprador')) {
		actionContainer.innerHTML = `
		  <button onclick="closeQuoteManually('${quote.id}')" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow flex items-center gap-1.5">
			<i data-lucide="lock" class="w-4 h-4"></i> Encerrar e Fechar Cotação Agora
		  </button>
		`;
	  } else {
		actionContainer.innerHTML = '';
	  }

	  if (sellers.length === 0) {
		container.innerHTML = `<div class="text-center py-12 text-gray-500 font-medium">Nenhum vendedor respondeu a esta cotação até o momento.</div>`;
		lucide.createIcons();
		document.getElementById("modal-view-proposals").classList.remove("hidden");
		return;
	  }

	  // Inicializa mapa de vencedores desta cotação caso ainda não exista
	  if (!window.selectedWinnersMap[quote.id]) {
		window.selectedWinnersMap[quote.id] = {};
	  }

	  // Identifica o menor preço e o segundo menor preço de cada item
	  quote.items.forEach(item => {
		const validPrices = sellers
		  .map(s => ({ sellerId: s.sellerId, price: s.itemsPrice ? s.itemsPrice[item.id] : 0 }))
		  .filter(p => p.price > 0)
		  .sort((a, b) => a.price - b.price);

		// Se o usuário ainda não escolheu um vencedor manualmente, o padrão é o menor preço
		if (!window.selectedWinnersMap[quote.id][item.id] && validPrices.length > 0) {
		  window.selectedWinnersMap[quote.id][item.id] = validPrices[0].sellerId;
		}
	  });

	  // Agrupa os itens para montagem dos Pedidos por Fornecedor Vencedor
	  const winningOrders = {};
	  quote.items.forEach(item => {
		const selectedSellerId = window.selectedWinnersMap[quote.id][item.id];
		if (selectedSellerId) {
		  const seller = sellers.find(s => s.sellerId === selectedSellerId);
		  const price = seller && seller.itemsPrice ? seller.itemsPrice[item.id] : 0;

		  if (seller && price > 0) {
			if (!winningOrders[selectedSellerId]) {
			  winningOrders[selectedSellerId] = { sellerInfo: seller, items: [], total: 0 };
			}
			const itemTotal = item.qty * price;
			winningOrders[selectedSellerId].items.push({
			  code: item.code, name: item.name, qty: item.qty, unitPrice: price, totalPrice: itemTotal
			});
			winningOrders[selectedSellerId].total += itemTotal;
		  }
		}
	  });

	  // Tabela Comparativa de Preços
	  let html = `
		<div class="overflow-x-auto border rounded-xl shadow-sm">
		  <table class="w-full text-left text-xs border-collapse">
			<thead>
			  <tr class="bg-gray-100 border-b text-gray-700">
				<th class="p-3 font-bold border-r min-w-[180px] sticky left-0 bg-gray-100 z-10">Produto / Item</th>
				<th class="p-3 font-bold border-r w-16 text-center">Qtd.</th>
				${sellers.map(s => `
				  <th class="p-3 border-r min-w-[160px] text-center bg-blue-50/50">
					<div class="font-bold text-gray-900 text-sm">${s.sellerCompany}</div>
					<div class="text-gray-500 font-normal">${s.sellerName}</div>
					<div class="text-blue-700 font-semibold mt-1 bg-blue-100 px-2 py-0.5 rounded">Prazo: ${s.paymentTerms}</div>
				  </th>
				`).join('')}
			  </tr>
			</thead>
			<tbody class="divide-y">
	  `;

	  quote.items.forEach(item => {
		// Ordena os preços válidos do item para encontrar o 1º e 2º lugar
		const sortedPrices = sellers
		  .map(s => ({ sellerId: s.sellerId, price: s.itemsPrice ? s.itemsPrice[item.id] : 0 }))
		  .filter(p => p.price > 0)
		  .sort((a, b) => a.price - b.price);

		const firstPlace = sortedPrices[0] || null;
		const secondPlace = sortedPrices[1] || null;

		// Regra dos 30%: Menor preço é >= 30% mais barato que o 2º colocado?
		let isSuspicious = false;
		if (firstPlace && secondPlace && secondPlace.price > 0) {
		  const discountRatio = (secondPlace.price - firstPlace.price) / secondPlace.price;
		  if (discountRatio >= 0.30) {
			isSuspicious = true;
		  }
		}

		const currentWinnerId = window.selectedWinnersMap[quote.id][item.id];

		html += `
		  <tr class="hover:bg-gray-50">
			<td class="p-3 border-r font-medium text-gray-800 sticky left-0 bg-white shadow-sm">
			  <div>${item.name}</div>
			  <div class="text-[10px] text-gray-400 font-mono">${item.code}</div>
			</td>
			<td class="p-3 border-r text-center font-bold text-gray-600">${item.qty}</td>
			${sellers.map(s => {
			  const price = s.itemsPrice ? s.itemsPrice[item.id] : 0;
			  const isSelected = s.sellerId === currentWinnerId && price > 0;
			  const isLowest = firstPlace && s.sellerId === firstPlace.sellerId;

			  // Define a cor de destaque e a tag de status
			  let bgStyle = '';
			  let tagBadge = '';

			  if (price > 0) {
				if (isLowest && isSuspicious) {
				  // ALERTA DE PREÇO SUSPEITO (VERMELHO)
				  bgStyle = 'bg-red-100 text-red-900 border-2 border-red-300';
				  tagBadge = `<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded uppercase font-bold flex items-center justify-center gap-0.5 mt-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Atenção (-${Math.round(((secondPlace.price - firstPlace.price)/secondPlace.price)*100)}%)</span>`;
				} else if (isSelected) {
				  // VENDEDOR SELECIONADO (VERDE)
				  bgStyle = 'bg-green-100/80 text-green-900 font-bold';
				  tagBadge = `<span class="text-[9px] bg-green-600 text-white px-1.5 py-0.5 rounded uppercase font-bold mt-1 inline-block">Vencedor</span>`;
				}
			  }

			  return `
				<td class="p-3 border-r text-center transition-all ${bgStyle}">
				  <div class="flex items-center justify-center gap-1.5 mb-1">
					${price > 0 && (currentUser.role === 'admin' || currentUser.role === 'comprador') ? `
					  <input type="radio" name="winner_${quote.id}_${item.id}" 
						${isSelected ? 'checked' : ''} 
						onchange="setManualWinner('${quote.id}', '${item.id}', '${s.sellerId}')"
						class="w-3.5 h-3.5 text-blue-600 cursor-pointer" title="Clique para escolher este fornecedor como vencedor">
					` : ''}
					<span class="font-semibold">${price > 0 ? `R$ ${price.toFixed(2)}` : '-'}</span>
				  </div>
				  <div class="text-[10px] text-gray-500">Total: R$ ${(price * item.qty).toFixed(2)}</div>
				  ${tagBadge}
				</td>
			  `;
			}).join('')}
		  </tr>
		`;
	  });

	  html += `
		<tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
		  <td class="p-3 border-r text-right sticky left-0 bg-gray-100 z-10" colspan="2">TOTAL GERAL DA PROPOSTA:</td>
		  ${sellers.map(s => `
			<td class="p-3 border-r text-center text-sm text-blue-900 bg-blue-50">R$ ${s.total.toFixed(2)}</td>
		  `).join('')}
		</tr>
		</tbody>
		</table>
		</div>
	  `;

	  // Bloco de Pedidos Gerados por Fornecedor (Respeitando a Escolha Manual)
	  if (isClosed) {
		html += `
		  <div class="mt-8 pt-6 border-t">
			<h4 class="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
			  <i data-lucide="trophy" class="w-5 h-5 text-yellow-600"></i> Pedidos de Compra por Fornecedor Vencedor
			</h4>
			<p class="text-xs text-gray-500 mb-4">Abaixo estão os pedidos consolidados de acordo com os fornecedores selecionados acima.</p>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		`;

		const winnerSellersList = Object.values(winningOrders);
		if (winnerSellersList.length === 0) {
		  html += `<p class="text-sm text-gray-500 italic">Nenhum item com fornecedor vencedor selecionado.</p>`;
		} else {
		  winnerSellersList.forEach(w => {
			html += `
			  <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
				<div>
				  <div class="flex justify-between items-start mb-2">
					<div>
					  <h5 class="font-bold text-gray-800">${w.sellerInfo.sellerCompany}</h5>
					  <p class="text-xs text-gray-500">${w.sellerInfo.sellerName} • ${w.sellerInfo.sellerPhone}</p>
					</div>
					<span class="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
					  ${w.items.length} item(ns) ganho(s)
					</span>
				  </div>
				  <p class="text-xs text-gray-600 mb-1">Prazo de Pagamento: <strong>${w.sellerInfo.paymentTerms}</strong></p>
				  <p class="text-sm font-bold text-gray-900 mb-3">Valor Total do Pedido: <span class="text-green-700">R$ ${w.total.toFixed(2)}</span></p>
				</div>
				
				<button onclick="generateWinnerPDF('${quote.id}', '${w.sellerInfo.sellerId}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow transition-colors">
				  <i data-lucide="file-down" class="w-4 h-4"></i> Gerar Pedido em PDF
				</button>
			  </div>
			`;
		  });
		}
		html += `</div></div>`;
	  }

	  container.innerHTML = html;
	  lucide.createIcons();
	  document.getElementById("modal-view-proposals").classList.remove("hidden");
	};

	// GERAR PDF DO PEDIDO RESPEITANDO OS VENDEDORES SELECIONADOS MANMENTE
	window.generateWinnerPDF = function(quoteId, sellerId) {
	  const quote = quotesList.find(q => q.id === quoteId);
	  if (!quote) return;

	  const proposalsObj = quote.proposals || {};
	  const sellers = Object.values(proposalsObj);
	  const seller = sellers.find(s => s.sellerId === sellerId);
	  if (!seller) return;

	  const winningItems = [];
	  let grandTotal = 0;

	  // Busca os vencedores selecionados no mapa global
	  const winnersMap = window.selectedWinnersMap[quoteId] || {};

	  quote.items.forEach(item => {
		const selectedSellerId = winnersMap[item.id];
		
		// Se este for o vendedor escolhido para este item
		if (selectedSellerId === sellerId) {
		  const price = seller.itemsPrice ? seller.itemsPrice[item.id] : 0;
		  if (price > 0) {
			const itemTotal = item.qty * price;
			winningItems.push({
			  code: item.code, name: item.name, qty: item.qty, unitPrice: price, totalPrice: itemTotal
			});
			grandTotal += itemTotal;
		  }
		}
	  });

	  if (winningItems.length === 0) {
		showAlert("Este fornecedor não possui itens ganhos nesta seleção.", true);
		return;
	  }

	  const { jsPDF } = window.jspdf;
	  const doc = new jsPDF();
	  let y = 15;

	  doc.setFont("helvetica", "bold");
	  doc.setFontSize(16);
	  doc.setTextColor(29, 78, 216);
	  doc.text(quote.buyerCompany || "Supermercado Júpiter", 14, y);

	  doc.setFontSize(10);
	  doc.setTextColor(107, 114, 128);
	  doc.text("PEDIDO DE COMPRA / COTAÇÃO DE PREÇOS", 14, y + 6);

	  doc.setFontSize(9);
	  doc.setTextColor(17, 24, 39);
	  doc.text(`Cotação: ${quote.title}`, 200, y, { align: "right" });
	  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 200, y + 6, { align: "right" });

	  y += 18;
	  doc.setLineWidth(0.5);
	  doc.setDrawColor(29, 78, 216);
	  doc.line(14, y, 200, y);

	  y += 8;
	  doc.setFillColor(249, 250, 251);
	  doc.setDrawColor(229, 231, 235);
	  doc.roundedRect(14, y, 186, 26, 2, 2, "FD");

	  doc.setFont("helvetica", "bold");
	  doc.setFontSize(9);
	  doc.setTextColor(55, 65, 81);
	  doc.text("DADOS DO FORNECEDOR VENCEDOR:", 18, y + 6);
	  doc.text("CONDIÇÕES COMERCIAIS:", 120, y + 6);

	  doc.setFont("helvetica", "normal");
	  doc.setFontSize(9);
	  doc.text(`Empresa: ${seller.sellerCompany}`, 18, y + 12);
	  doc.text(`Contato: ${seller.sellerName}`, 18, y + 17);
	  doc.text(`Telefone: ${seller.sellerPhone}`, 18, y + 22);
	  doc.text(`Prazo de Pagamento: ${seller.paymentTerms}`, 120, y + 12);

	  y += 34;

	  doc.setFont("helvetica", "bold");
	  doc.setFontSize(10);
	  doc.setTextColor(55, 65, 81);
	  doc.text("ITENS GANHOS NO PROCESSO DE COTAÇÃO:", 14, y);

	  y += 6;
	  doc.setFillColor(243, 244, 246);
	  doc.rect(14, y, 186, 8, "F");
	  
	  doc.setFont("helvetica", "bold");
	  doc.setFontSize(9);
	  doc.setTextColor(55, 65, 81);
	  doc.text("Código", 18, y + 5.5);
	  doc.text("Descrição do Produto", 45, y + 5.5);
	  doc.text("Qtd.", 130, y + 5.5, { align: "center" });
	  doc.text("Preço Unit.", 160, y + 5.5, { align: "right" });
	  doc.text("Total Item", 196, y + 5.5, { align: "right" });

	  y += 8;
	  doc.setFont("helvetica", "normal");
	  doc.setFontSize(9);
	  
	  winningItems.forEach((item, index) => {
		if (y > 270) {
		  doc.addPage();
		  y = 20;
		}
		if (index % 2 !== 0) {
		  doc.setFillColor(249, 250, 251);
		  doc.rect(14, y, 186, 7, "F");
		}

		doc.setTextColor(107, 114, 128);
		doc.text(String(item.code), 18, y + 5);

		doc.setTextColor(17, 24, 39);
		const productName = item.name.length > 40 ? item.name.substring(0, 37) + "..." : item.name;
		doc.text(productName, 45, y + 5);

		doc.setFont("helvetica", "bold");
		doc.text(String(item.qty), 130, y + 5, { align: "center" });

		doc.setFont("helvetica", "normal");
		doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 160, y + 5, { align: "right" });
		doc.text(`R$ ${item.totalPrice.toFixed(2)}`, 196, y + 5, { align: "right" });

		y += 7;
	  });

	  y += 4;
	  doc.setLineWidth(0.3);
	  doc.setDrawColor(209, 213, 219);
	  doc.line(14, y, 200, y);

	  y += 8;
	  doc.setFont("helvetica", "bold");
	  doc.setFontSize(10);
	  doc.setTextColor(107, 114, 128);
	  doc.text("VALOR TOTAL DO PEDIDO DE COMPRA:", 135, y, { align: "right" });

	  doc.setFontSize(14);
	  doc.setTextColor(22, 163, 74);
	  doc.text(`R$ ${grandTotal.toFixed(2)}`, 200, y, { align: "right" });

	  doc.save(`Pedido_Compra_${seller.sellerCompany.replace(/\s+/g, '_')}.pdf`);
	  showAlert("PDF do pedido gerado com sucesso!");
	};
	
	window.closeProposalsModal = function() {
		document.getElementById("modal-view-proposals").classList.add("hidden");
	};

	window.addEventListener("DOMContentLoaded", () => {
	  const saved = localStorage.getItem("session_user");
	  if (saved) {
		currentUser = JSON.parse(saved);
		initUserSession();
	  }
	  lucide.createIcons();
	});
	
	// CONTROLE DO MODAL DE RECUPERAÇÃO DE SENHA
	window.openForgotPasswordModal = function() {
	  const currentEmail = document.getElementById("login-email").value.trim();
	  document.getElementById("reset-email").value = currentEmail;
	  document.getElementById("modal-forgot-password").classList.remove("hidden");
	  lucide.createIcons();
	};

	window.closeForgotPasswordModal = function() {
	  document.getElementById("modal-forgot-password").classList.add("hidden");
	};

	// DISPARAR E-MAIL DE REDEFINIÇÃO DE SENHA
	window.handlePasswordReset = async function(e) {
	  e.preventDefault();
	  const email = document.getElementById("reset-email").value.trim().toLowerCase();

	  try {
		await sendPasswordResetEmail(auth, email);
		showAlert(`E-mail de redefinição enviado para ${email}! Verifique sua caixa de entrada e spam.`);
		closeForgotPasswordModal();
	  } catch (err) {
		console.error("Erro ao solicitar redefinição de senha:", err);
		let msg = err.message;
		if (err.code === 'auth/user-not-found') {
		  msg = "E-mail não encontrado no sistema.";
		} else if (err.code === 'auth/invalid-email') {
		  msg = "Endereço de e-mail inválido.";
		}
		showAlert("Erro ao enviar e-mail: " + msg, true);
	  }
	};