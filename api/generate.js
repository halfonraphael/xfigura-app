export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, width = 1344, height = 768, inputImage } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) return res.status(500).json({ error: 'HF_TOKEN not configured' });

  try {
    let imageBuffer;

    if (inputImage) {
      // img2img — instruct-pix2pix
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
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // text2img — FLUX.1-schnell
      const response = await fetch(
        'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { width, height, num_inference_steps: 4 },
          }),
        }
      );

      if (!response.ok) {
        const txt = await response.text();
        return res.status(response.status).json({ error: txt });
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    }

    const base64 = imageBuffer.toString('base64');
    return res.status(200).json({ image: `data:image/jpeg;base64,${base64}` });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
}
