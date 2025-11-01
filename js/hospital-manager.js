// Hospital Layer Manager
// Handles all hospital-related operations

class HospitalManager {
  constructor(map, hospitalsLayer, uiManager) {
    this.map = map;
    this.hospitalsLayer = hospitalsLayer;
    this.uiManager = uiManager;
    this.fidToFeature = new Map();
  }

  buildPopupContent(feature) {
    const p = feature.properties || {};
    const label = p.name_th || p.name_en || p.name || "โรงพยาบาล";
    const district = p.district ? `<div>เขต: ${p.district}</div>` : "";
    const addr = p.address || p.addr || "";
    const src = p.source
      ? `<div style="font-size:12px;opacity:0.8">แหล่งข้อมูล: ${p.source}</div>`
      : "";
    const fid =
      feature.id || (feature.properties && feature.properties.id) || "";

    return `
      <div class="popup-content">
        <strong>${label}</strong>
        ${district}
        <div>${addr}</div>
        ${src}
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button class="edit-hospital" data-fid="${fid}">แก้ไข</button>
          <button class="delete-hospital" data-fid="${fid}">ลบ</button>
        </div>
      </div>`;
  }

  async loadHospitals(filter = null) {
    this.uiManager.showLoading("กำลังโหลดข้อมูลโรงพยาบาล...", "กรุณารอสักครู่");

    try {
      const data = await geoServerAPI.fetchHospitals(filter);

      this.hospitalsLayer.clearLayers();
      this.fidToFeature.clear();

      if (!data || !data.features || data.features.length === 0) {
        this.uiManager.hideLoading();
        return;
      }

      data.features.forEach((feature) => {
        const fid = feature.id || (feature.properties && feature.properties.id);
        if (fid) this.fidToFeature.set(fid, feature);

        const marker = L.geoJSON(feature, {
          pointToLayer: (feat, latlng) => {
            const p = feat.properties || {};
            const name = p.name_th || p.name_en || p.name || "";
            const isCommunity = name.includes("ชุมชน");
            const color = isCommunity ? "#10b981" : "#3b82f6";
            const radius = isCommunity ? 5 : 8;

            return L.circleMarker(latlng, {
              radius: radius,
              fillColor: color,
              color: "#fff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7,
            });
          },
          onEachFeature: (feat, layer) => {
            layer.bindPopup(this.buildPopupContent(feat));
          },
        });

        this.hospitalsLayer.addLayer(marker);
      });

      this.uiManager.hideLoading();
    } catch (error) {
      console.error("Error loading hospitals:", error);
      this.uiManager.hideLoading();
    }
  }

  getFeature(fid) {
    return this.fidToFeature.get(fid);
  }
}
