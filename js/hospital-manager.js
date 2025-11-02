/*
  Hospital Manager (บทสรุปภาษาไทย)
  - ดูแลการโหลดและแสดงข้อมูลโรงพยาบาลบนแผนที่
  - สร้าง marker, popup และจัดการการค้นหา/แก้ไข/ลบข้อมูลผ่าน GeoServer
  - เหมาะสำหรับผู้ดูแลข้อมูลที่ต้องการเพิ่ม/ปรับข้อมูลสถานพยาบาล
*/
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
    try {
      console.log("กำลังโหลดข้อมูลโรงพยาบาล...", filter);
      this.hospitalsLayer.clearLayers();
      this.fidToFeature.clear();

      // ดึงข้อมูลจาก GeoServer (ไม่ส่ง filter ไปเพื่อให้ได้ข้อมูลทั้งหมด)
      const data = await geoServerAPI.fetchHospitals();
      console.log(`โหลดโรงพยาบาล: ${data.features.length} แห่ง`);

      // Apply client-side filtering
      let filteredFeatures = data.features;
      if (filter) {
        filteredFeatures = data.features.filter((feature) => {
          const props = feature.properties;
          let match = true;

          // Filter by name (partial match, case-insensitive)
          if (filter.name) {
            const name = (props.name_th || "").toLowerCase();
            match = match && name.includes(filter.name.toLowerCase());
          }

          // Filter by district (exact match)
          if (filter.district) {
            const district = props.district || "";
            match = match && district === filter.district;
          }

          return match;
        });
        console.log(`กรองเหลือ: ${filteredFeatures.length} แห่ง`);
      }

      filteredFeatures.forEach((feature) => {
        const fid = feature.id || (feature.properties && feature.properties.id);
        if (fid) this.fidToFeature.set(fid, feature);

        const marker = L.geoJSON(feature, {
          pointToLayer: (_feat, latlng) => {
            const color = "#3b82f6";
            const radius = 8;

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
    } catch (error) {
      console.error("Error loading hospitals:", error);
    }
  }

  getFeature(fid) {
    return this.fidToFeature.get(fid);
  }
}
