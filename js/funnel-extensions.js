/**
 * Busca os dados de perfil via proxy.
 * Substitui o antigo fetch que assumia que a resposta era sempre JSON.
 *
 * @param {string} username   nome de usuário a ser consultado
 */
async function fetchInstagramProfile(username) {
  try {
    const url = `/api/proxy/instagram?tipo=perfil&username=${encodeURIComponent(username)}`;
    const resp = await fetch(url);

    // 1️⃣ Verifica se a resposta HTTP foi bem‑sucedida (código 2xx)
    if (!resp.ok) {
      const txt = await resp.text();                 // pode ser HTML ou texto de erro
      console.warn('Erro da API', resp.status, txt);
      alert('Não foi possível obter o perfil. Tente novamente mais tarde.');
      return;
    }

    // 2️⃣ Só tenta ler JSON quando a resposta está OK
    const data = await resp.json();

    // ---- A partir daqui você pode usar `data` como antes ----
    // exemplo simples:
    console.log('Dados do perfil:', data);
    // (coloque aqui o código que já existia para exibir a UI, etc.)
    // -------------------------------------------------------

  } catch (e) {
    // 3️⃣ Captura falhas de rede ou de parsing
    console.error('Falha ao buscar o perfil', e);
    alert('Erro de comunicação com o servidor. Verifique sua conexão.');
  }
}
