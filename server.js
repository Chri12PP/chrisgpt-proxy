app.get("/tripadvisor", async (req, res) => {
  const raw = req.query.q;
  if (!raw) return res.json({ found: false });

  // 🔥 FIX: normalizzazione
  const q = raw
    .replace(/italy/gi, "")
    .replace(/italia/gi, "")
    .replace(/verona/gi, "Verona")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const searchUrl =
      "https://api.content.tripadvisor.com/api/v1/location/search?key=" +
      TA_KEY +
      "&searchQuery=" +
      encodeURIComponent(q) +
      "&language=it";

    const sRes = await fetch(searchUrl);
    const sJson = await sRes.json();

    if (!sJson.data || !sJson.data.length) {
      return res.json({ found: false, tried: q });
    }

    const id = sJson.data[0].location_id;

    const detUrl =
      "https://api.content.tripadvisor.com/api/v1/location/" +
      id +
      "/details?key=" +
      TA_KEY +
      "&language=it";

    const dRes = await fetch(detUrl);
    const det = await dRes.json();

    return res.json({
      found: true,
      id,
      name: det.name || q,
      photo: det.photo?.images?.large?.url || null,
      rating: det.rating || null,
      reviews: det.num_reviews || null,
      address: det.address_obj || null
    });

  } catch (e) {
    return res.json({ error: e.toString(), tried: q });
  }
});
