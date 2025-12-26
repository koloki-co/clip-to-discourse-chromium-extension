// Create a new Discourse post (topic or reply) via the API.
export async function createPost({ baseUrl, apiUsername, apiKey, payload }) {
  const response = await fetch(`${baseUrl}/posts.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
      "Api-Username": apiUsername
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      (data && (data.errors || data.error)) ? (data.errors || data.error).toString() : response.statusText;
    throw new Error(`Discourse error: ${errorMessage}`);
  }

  return data;
}

// Lightweight API call to verify credentials and host availability.
export async function testConnection({ baseUrl, apiUsername, apiKey }) {
  const response = await fetch(`${baseUrl}/t/1.json`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
      "Api-Username": apiUsername
    }
  });

  let data = null;
  let rawText = "";
  try {
    data = await response.json();
  } catch (error) {
    try {
      rawText = await response.text();
    } catch (textError) {
      rawText = "";
    }
  }

  if (!response.ok) {
    let errorMessage = response.statusText;
    if (data && (data.errors || data.error)) {
      errorMessage = (data.errors || data.error).toString();
    } else if (rawText) {
      errorMessage = rawText;
    }
    throw new Error(`Discourse error: ${errorMessage}`);
  }

  return data;
}
