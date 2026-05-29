export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, aspectRatio } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return res.status(500).json({ error: 'HF_TOKEN not configured' });
  }

  // Flux.1-dev : meilleure qualité architecturale
  const model = 'black-forest-labs/FLUX.1-schnell';
  const url = `https://router.huggingface.co/hf-inference/models/${model}`;

  // Adapter les dimensions selon l'aspect ratio
  const dimensions = {
    '16:9': { width: 1344, height: 768 },
    '1:1':  { width: 1024, height: 1024 },
    '9:16': { width: 768,  height: 1344 },
    '4:3':  { width: 1152, height: 896 },
  };
  const { width, height } = dimensions[aspectRatio] || dimensions['16:9'];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width, height, num_inference_steps: 28 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('HF API error:', text);
      return res.status(response.status).json({ error: `HF API error: ${text}` });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return res.status(200).json({
      image: `data:image/jpeg;base64,${base64}`,
      mimeType: 'image/jpeg',
    });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
}
