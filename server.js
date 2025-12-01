// ================================================
//  TRIPADVISOR PHOTO TEST (USA TA_KEY DA RENDER)
// ================================================
app.get("/tripadvisor-test", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: "Manca parametro q" });

  const TA_KEY = process.env.TA_KEY;   // <-- QUI
  if (!TA_KEY) return res.json({ error: "TA_KEY mancante" });

  try {
    // 1️⃣ CERCA LA LOCATION
    const searchUrl =
      "https://api.content.tripadvisor.com/api/v1/location/search?key=" +
      TA_KEY +
      "&searchQuery=" +
      encodeURIComponent(query) +
      "&language=it";

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.data || !searchData.data.length) {
      return res.json({ error: "Nessun risultato trovato", raw: searchData });
    }

    const locId = searchData.data[0].location_id;

    // 2️⃣ OTTIENI LE FOTO
    const photoUrl =
      "https://api.content.tripadvisor.com/api/v1/location/" +
      locId +
      "/photos?key=" +
      TA_KEY +
      "&language=it";

    const photoRes = await fetch(photoUrl);
    const photoData = await photoRes.json();

    return res.json({
      query,
      location_id: locId,
      photos: photoData
    });
  } catch (err) {
    return res.json({ error: err.toString() });
  }
});
