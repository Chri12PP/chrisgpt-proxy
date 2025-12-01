// ============================================================
//   🔥🔥🔥 ENDPOINT TRIPADVISOR (VERSIONE STABILE) 🔥🔥🔥
// ============================================================
app.get("/tripadvisor", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ found: false });

  try {
    // ============================
    // 1️⃣ TENTATIVO CON SEARCH
    // ============================
    let searchUrl =
      "https://api.content.tripadvisor.com/api/v1/location/search?key=" +
      TA_KEY +
      "&searchQuery=" +
      encodeURIComponent(q) +
      "&language=it";

    let sRes = await fetch(searchUrl);
    let sJson = await sRes.json();

    let id = null;

    if (sJson.data && sJson.data.length > 0) {
      id = sJson.data[0].location_id;
    }

    // ============================
    // 2️⃣ SE SEARCH FALLISCE → AUTOCOMPLETE
    // ============================
    if (!id) {
      let autoUrl =
        "https://api.content.tripadvisor.com/api/v1/location/autocomplete?key=" +
        TA_KEY +
        "&searchQuery=" +
        encodeURIComponent(q) +
        "&language=it";

      let aRes = await fetch(autoUrl);
      let aJson = await aRes.json();

      if (aJson.data && aJson.data.length > 0) {
        id = aJson.data[0].location_id;
      }
    }

    // Se ANCORA nessun ID → nulla da mostrare
    if (!id) {
      return res.json({ found: false });
    }

    // ============================
    // 3️⃣ DETTAGLI COMPLETI
    // ============================
    let detUrl =
      "https://api.content.tripadvisor.com/api/v1/location/" +
      id +
      "/details?key=" +
      TA_KEY +
      "&language=it";

    let dRes = await fetch(detUrl);
    let det = await dRes.json();

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
    return res.status(500).json({ error: e.toString() });
  }
});
