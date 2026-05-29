export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, width = 1344, height = 768, inputImage } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) return res.status(500).json({ error: 'HF_TOKEN not configured' });

  try {
    let base64Image;

    if (inputImage) {
      // img2img — instruct-pix2pix via hf-inference
      const base64Data = inputImage.replace(/^data:image\/\w+;base64,/, '');
      const imgBytes = Buffer.from(base64Data, 'base64');

      const response = await fetch(
        'https://router.huggingface.co/hf-inference/models/timbrooks/instruct-pix2pix',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/octet-stream',
            'X-Use-Cache': 'false',
            'X-Parameters': JSON.stringify({
              prompt,
              num_inference_steps: 20,
              image_guidance_scale: 1.5,
              guidance_scale: 7,
            }),
          },
          body: imgBytes,
        }
      );

      if (!response.ok) {
        const txt = await response.text();
        return res.status(response.status).json({ error: txt });
      }
      base64Image = Buffer.from(await response.arrayBuffer()).toString('base64');

    } else {
      // text2img — FLUX.1-schnell via Nebius (OpenAI-compatible)
      const response = await fetch(
        'https://router.huggingface.co/nebius/v1/images/generations',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'black-forest-labs/FLUX.1-schnell',
            prompt,
            response_format: 'b64_json',
            width,
            height,
            num_inference_steps: 4,
          }),
        }
      );

      if (!response.ok) {
        const txt = await response.text();
        return res.status(response.status).json({ error: txt });
      }

      const data = await response.json();
      base64Image = data.data?.[0]?.b64_json;
      if (!base64Image) return res.status(500).json({ error: 'No image in response' });
    }

    return res.status(200).json({ image: `data:image/jpeg;base64,${base64Image}` });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
}
