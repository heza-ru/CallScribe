(() => {
  if (window.__callscribe_fetcher_registered__) return;
  window.__callscribe_fetcher_registered__ = true;

  const GRAPHQL_ENDPOINT = 'https://whatfix.mindtickle.com/callai/apollo-server/graphapi';
  const PERSISTED_QUERY_HASH = '27d351349d41a6e7b4d395b518fc6895d852022663b7c5556833402edcc38236';

  async function doFetch(body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Transcript API responded with status ${response.status}`);
    return response.json();
  }

  function extractChunks(data) {
    if (data.errors?.length > 0) throw new Error(data.errors[0].message || 'GraphQL error');
    const chunks = data?.data?.recording?.transcription?.chunks;
    if (!chunks) throw new Error('No transcription chunks found in API response');
    return chunks;
  }

  function isAPQMiss(data) {
    return data.errors?.some(
      e => e.extensions?.code === 'PERSISTED_QUERY_NOT_FOUND' ||
           e.message === 'PersistedQueryNotFound'
    );
  }

  async function fetchTranscript(meetingId, token) {
    // Use chunks already captured from Mindtickle's own page request
    const captured = window.__cs_captured;
    if (captured?.chunks?.length > 0 && (captured.meetingId === meetingId || captured.meetingId === null)) {
      return captured.chunks;
    }

    // Fallback: make our own APQ request
    const apqBody = {
      operationName: 'GetTranscription',
      variables: { id: meetingId },
      extensions: {
        persistedQuery: { version: 1, sha256Hash: PERSISTED_QUERY_HASH },
      },
    };

    const data = await doFetch(apqBody, token);

    // APQ cache miss — retry with full query document if Mindtickle ever sent one
    if (isAPQMiss(data)) {
      const capturedQuery = window.__cs_qt_GetTranscription;
      if (capturedQuery) {
        const retryData = await doFetch({ ...apqBody, query: capturedQuery }, token);
        return extractChunks(retryData);
      }
      throw new Error('Transcript not yet loaded — please wait for the Mindtickle page to finish loading, then try again.');
    }

    return extractChunks(data);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'FETCH_TRANSCRIPT') return false;

    const { meetingId, token } = message;

    fetchTranscript(meetingId, token)
      .then(chunks => sendResponse({ success: true, chunks }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  });
})();
