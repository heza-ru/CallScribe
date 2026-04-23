(() => {
  if (window.__cs_qi_installed__) return;
  window.__cs_qi_installed__ = true;

  const GRAPHQL_ENDPOINT = 'https://whatfix.mindtickle.com/callai/apollo-server/graphapi';
  const origFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const response = await origFetch(input, init);

    if (url === GRAPHQL_ENDPOINT) {
      response.clone().json().then(data => {
        const recording = data?.data?.recording;
        if (!recording) return;

        // Capture transcript chunks
        const chunks = recording?.transcription?.chunks;
        if (chunks?.length > 0) {
          try {
            const body = init?.body ? JSON.parse(init.body) : null;
            const meetingId = body?.variables?.id ?? null;
            window.__cs_captured = { meetingId, chunks };
          } catch {
            window.__cs_captured = { meetingId: null, chunks };
          }
        }

        // Capture full query document if Mindtickle ever sends one (APQ miss fallback)
        try {
          const body = init?.body ? JSON.parse(init.body) : null;
          if (body?.operationName === 'GetTranscription' && body?.query) {
            window.__cs_qt_GetTranscription = body.query;
          }
        } catch {}
      }).catch(() => {});
    }

    return response;
  };
})();
