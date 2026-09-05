(() => {
  const config = window.VTT_CONFIG || {};
  const status = document.getElementById("auth-status");
  const guest = document.getElementById("auth-guest");
  const userPanel = document.getElementById("auth-user");
  const accountText = document.getElementById("account-text");
  const mesasList = document.getElementById("mesas-list");
  const form = document.getElementById("magic-form");
  const logout = document.getElementById("logout");

  function setStatus(message, kind = "") {
    if (!status) return;
    status.textContent = message || "";
    if (kind) status.dataset.kind = kind;
    else delete status.dataset.kind;
  }

  const ready =
    config.supabaseUrl &&
    config.supabasePublishableKey &&
    !config.supabasePublishableKey.includes("COLE_AQUI");

  if (!ready || !window.supabase) {
    setStatus("A conexão com o Supabase ainda precisa da chave publicável no arquivo config.js.", "error");
    if (form) form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  const client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey
  );

  async function loadTables() {
    mesasList.innerHTML = "";
    const { data, error } = await client
      .from("campaigns")
      .select("id,name,description,status,created_at")
      .order("updated_at", { ascending: false });

    if (error) {
      mesasList.innerHTML = "<li>Não foi possível carregar suas mesas agora.</li>";
      return;
    }

    if (!data || data.length === 0) {
      mesasList.innerHTML = "<li>Você ainda não participa de nenhuma mesa.</li>";
      return;
    }

    for (const campaign of data) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = campaign.name;
      item.appendChild(title);
      if (campaign.description) {
        const desc = document.createElement("span");
        desc.textContent = " — " + campaign.description;
        item.appendChild(desc);
      }
      mesasList.appendChild(item);
    }
  }

  async function renderSession(session) {
    const user = session?.user;
    if (!user) {
      guest.hidden = false;
      userPanel.hidden = true;
      accountText.textContent = "";
      mesasList.innerHTML = "";
      return;
    }

    guest.hidden = true;
    userPanel.hidden = false;
    accountText.textContent = "Você entrou como " + (user.email || "jogador") + ".";
    await loadTables();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("magic-email").value.trim();
    if (!email) return;

    setStatus("Enviando seu link de acesso...");
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      setStatus("Não foi possível enviar o link de acesso: " + error.message, "error");
      return;
    }

    setStatus("Pronto. Abra o e-mail enviado pelo VTT e toque no link para entrar.", "success");
  });

  logout.addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) {
      setStatus("Não foi possível sair agora.", "error");
      return;
    }
    setStatus("Você saiu da conta.", "success");
    await renderSession(null);
  });

  client.auth.onAuthStateChange((_event, session) => {
    renderSession(session);
  });

  client.auth.getSession().then(({ data }) => renderSession(data.session));
})();