(() => {
  const config = window.VTT_CONFIG || {};
  const publicShell = document.getElementById("public-shell");
  const dashboard = document.getElementById("dashboard-shell");
  const status = document.getElementById("auth-status");
  const userStatus = document.getElementById("user-status");
  const accountText = document.getElementById("account-text");
  const welcomeText = document.getElementById("welcome-text");
  const mesasGrid = document.getElementById("mesas-grid");
  const form = document.getElementById("magic-form");
  const logout = document.getElementById("logout");
  const accountToggle = document.getElementById("account-toggle");
  const accountPanel = document.getElementById("account-panel");
  const createTable = document.getElementById("create-table");
  const menuToggle = document.getElementById("menu-toggle");
  const siteMenu = document.getElementById("site-menu");

  function setStatus(element, message, kind = "") {
    if (!element) return;
    element.textContent = message || "";
    if (kind) element.dataset.kind = kind;
    else delete element.dataset.kind;
  }

  function closeMenu(returnFocus = false) {
    siteMenu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    if (returnFocus) menuToggle.focus();
  }

  function openMenu() {
    siteMenu.hidden = false;
    menuToggle.setAttribute("aria-expanded", "true");
    siteMenu.querySelector("a,button")?.focus();
  }

  const ready = config.supabaseUrl && config.supabasePublishableKey && !config.supabasePublishableKey.includes("COLE_AQUI");
  if (!ready || !window.supabase) {
    setStatus(status, "A conexão com o Supabase ainda não está pronta.", "error");
    if (form) form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);

  function showPublic() {
    publicShell.hidden = false;
    dashboard.hidden = true;
    accountPanel.hidden = true;
    accountToggle.setAttribute("aria-expanded", "false");
    closeMenu(false);
  }

  function showDashboard() {
    publicShell.hidden = true;
    dashboard.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function campaignCard(campaign) {
    const article = document.createElement("article");
    article.className = "mesa-card";
    const title = document.createElement("h3");
    title.textContent = campaign.name;
    article.appendChild(title);
    const desc = document.createElement("p");
    desc.textContent = campaign.description || "Sem descrição ainda.";
    article.appendChild(desc);
    const meta = document.createElement("p");
    meta.className = "mesa-meta";
    meta.textContent = campaign.status === "archived" ? "Mesa arquivada" : "Mesa ativa";
    article.appendChild(meta);
    const action = document.createElement("button");
    action.type = "button";
    action.className = "button";
    action.textContent = "Abrir mesa";
    action.addEventListener("click", () => setStatus(userStatus, "A entrada na mesa será conectada na próxima etapa."));
    article.appendChild(action);
    return article;
  }

  async function loadTables() {
    mesasGrid.innerHTML = '<div class="empty-state card"><p>Carregando suas mesas...</p></div>';
    const { data, error } = await client.from("campaigns").select("id,name,description,status,created_at,updated_at").order("updated_at", { ascending: false });
    mesasGrid.innerHTML = "";
    if (error) {
      const box = document.createElement("div");
      box.className = "empty-state card";
      box.innerHTML = "<h3>Não conseguimos carregar suas mesas</h3><p>Tente novamente em instantes.</p>";
      mesasGrid.appendChild(box);
      return;
    }
    if (!data || data.length === 0) {
      const box = document.createElement("div");
      box.className = "empty-state card";
      box.innerHTML = "<h3>Sua estante de mesas ainda está vazia</h3><p>Quando você criar uma campanha ou aceitar um convite, ela vai aparecer aqui.</p>";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button";
      button.textContent = "Criar minha primeira mesa";
      button.addEventListener("click", () => setStatus(userStatus, "A criação de mesas será a próxima tela que vamos construir."));
      box.appendChild(button);
      mesasGrid.appendChild(box);
      return;
    }
    for (const campaign of data) mesasGrid.appendChild(campaignCard(campaign));
  }

  async function renderSession(session) {
    const user = session?.user;
    if (!user) {
      accountText.textContent = "";
      welcomeText.textContent = "Suas campanhas ficam reunidas aqui.";
      showPublic();
      return;
    }
    const displayName = user.user_metadata?.display_name || user.email || "jogador";
    accountText.textContent = "Sessão conectada em " + (user.email || "sua conta") + ".";
    welcomeText.textContent = "Bem-vindo, " + displayName + ". Escolha onde a história continua.";
    showDashboard();
    await loadTables();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("magic-email").value.trim();
    if (!email) return;
    setStatus(status, "Enviando seu link de acesso...");
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    if (error) {
      setStatus(status, "Não foi possível enviar o link de acesso: " + error.message, "error");
      return;
    }
    setStatus(status, "Pronto. Abra o e-mail enviado pelo VTT e toque no link para entrar.", "success");
  });

  menuToggle.addEventListener("click", () => siteMenu.hidden ? openMenu() : closeMenu(true));
  siteMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-menu-action]")?.dataset.menuAction;
    if (!action) return;
    event.preventDefault();
    closeMenu(false);
    const labels = {
      recursos: "A área de Recursos será conectada aqui.",
      guias: "A área de Guias será construída em seguida.",
      compendios: "A área de Compêndios será construída em seguida.",
      comunidade: "A área da Comunidade será construída em seguida.",
      sobre: "A área Sobre reunirá o projeto, seus princípios e acessibilidade.",
      configuracoes: "As Configurações serão abertas aqui em uma próxima etapa."
    };
    setStatus(userStatus, labels[action] || "");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !siteMenu.hidden) closeMenu(true);
  });

  accountToggle.addEventListener("click", () => {
    const opening = accountPanel.hidden;
    accountPanel.hidden = !opening;
    accountToggle.setAttribute("aria-expanded", String(opening));
  });

  createTable.addEventListener("click", () => setStatus(userStatus, "A criação de mesas é a próxima etapa."));

  logout.addEventListener("click", async () => {
    setStatus(userStatus, "Saindo...");
    const { error } = await client.auth.signOut();
    if (error) {
      setStatus(userStatus, "Não foi possível sair agora.", "error");
      return;
    }
    setStatus(userStatus, "");
    setStatus(status, "Você saiu da conta.", "success");
    await renderSession(null);
    document.getElementById("acesso")?.scrollIntoView();
  });

  client.auth.onAuthStateChange((_event, session) => renderSession(session));
  client.auth.getSession().then(({ data }) => renderSession(data.session));
})();