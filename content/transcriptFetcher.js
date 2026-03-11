const GRAPHQL_ENDPOINT = 'https://whatfix.mindtickle.com/callai/apollo-server/graphapi';
const PERSISTED_QUERY_HASH = '27d351349d41a6e7b4d395b518fc6895d852022663b7c5556833402edcc38236';

async function fetchTranscript(meetingId, token) {
  const body = {
    operationName: 'GetTranscription',
    variables: { id: meetingId },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: PERSISTED_QUERY_HASH,
      },
    },
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Transcript API responded with status ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(data.errors[0].message || 'GraphQL error');
  }

  const chunks = data?.data?.recording?.transcription?.chunks;
  if (!chunks) {
    throw new Error('No transcription chunks found in API response');
  }

  return chunks;
}

// Guard against duplicate registrations when injected multiple times
if (!window.__callscribe_fetcher_registered__) {
  window.__callscribe_fetcher_registered__ = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'FETCH_TRANSCRIPT') return false;

    const { meetingId, token } = message;

    fetchTranscript(meetingId, token)
      .then((chunks) => sendResponse({ success: true, chunks }))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true; // keep channel open for async response
  });
}
