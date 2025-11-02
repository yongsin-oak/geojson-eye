// Earthquake Manager - จัดการข้อมูลแผ่นดินไหว
class EarthquakeManager {
  constructor(quakesLayer, uiManager, cacheManager) {
    this.quakesLayer = quakesLayer;
    this.uiManager = uiManager;
    this.cacheManager = cacheManager;
  }

  async loadEarthquakes() {
    try {
      console.log("กำลังโหลดแผ่นดินไหว...");

      // ตรวจสอบ cache ก่อน
      if (this.cacheManager.isValid("quakes", "global")) {
        console.log("ใช้ cache แผ่นดินไหว");
        this.quakesLayer.clearLayers();
        const cachedData = this.cacheManager.get("quakes", "global");
        this.renderEarthquakes(cachedData);
        return;
      }

      // ดึงแผ่นดินไหวย้อนหลัง 7 วัน
      const res = await fetch(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"
      );
      const data = await res.json();

      this.cacheManager.set("quakes", "global", data);
      this.quakesLayer.clearLayers();
      this.renderEarthquakes(data);

      console.log(`โหลดแผ่นดินไหว: ${data.features.length} ครั้ง`);
    } catch (err) {
      console.error("USGS Earthquake API error:", err);
    }
  }

  renderEarthquakes(data) {
    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const mag = feature.properties.mag || 0;
        const depth = feature.geometry.coordinates[2];

        let color = "#3b82f6";
        if (depth > 300) color = "#dc2626";
        else if (depth > 100) color = "#f59e0b";

        return L.circleMarker(latlng, {
          radius: Math.max(4, mag * 2.5),
          fillColor: color,
          color: "#fff",
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.7,
          pane: "quakesPane",
        });
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const mag = p.mag || 0;
        const place = p.place || "Unknown";
        const time = new Date(p.time).toLocaleString("th-TH");
        const depth = feature.geometry.coordinates[2];

        let magIcon = "fa-house";
        let magColor = "#fbbf24";
        if (mag >= 6.0) {
          magIcon = "fa-house-crack";
          magColor = "#ef4444";
        } else if (mag >= 4.0) {
          magIcon = "fa-house-chimney-crack";
          magColor = "#f97316";
        }

        const hasTsunami = p.tsunami === 1;

        layer.bindPopup(`
          <div style="min-width:280px;">
            <div style="text-align:center;margin-bottom:12px;">
              <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">
                <i class="fa-solid fa-earth-americas" style="color:#06b6d4;margin-right:4px;"></i>
                แผ่นดินไหว
              </div>
              <strong style="font-size:16px;color:#f1f5f9;">${place}</strong>
            </div>
            <div style="background:#1e293b;padding:14px;border-radius:10px;">
              <div style="text-align:center;margin-bottom:12px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">
                  <i class="fa-solid ${magIcon}" style="color:${magColor};"></i>
                  ขนาด (Magnitude)
                </div>
                <div style="font-size:42px;font-weight:700;color:${magColor};">M ${mag.toFixed(
          1
        )}</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">
                    <i class="fa-solid fa-arrow-down" style="color:#64748b;"></i> ความลึก
                  </div>
                  <strong style="color:#f1f5f9;font-size:14px;">${depth.toFixed(
                    1
                  )}</strong>
                  <div style="font-size:9px;color:#64748b;">km</div>
                </div>
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">
                    <i class="fa-solid fa-water" style="color:${
                      hasTsunami ? "#ef4444" : "#22c55e"
                    };"></i> สึนามิ
                  </div>
                  <strong style="color:${
                    hasTsunami ? "#ef4444" : "#22c55e"
                  };font-size:14px;">${hasTsunami ? "มี" : "ไม่มี"}</strong>
                </div>
              </div>
              <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">
                  <i class="fa-regular fa-clock" style="margin-right:4px;"></i>
                  เวลา
                </div>
                <div style="color:#f1f5f9;font-size:11px;">${time}</div>
              </div>
            </div>
            <div style="color:#64748b;font-size:10px;margin-top:8px;text-align:center;">
              <i class="fa-solid fa-globe" style="margin-right:4px;"></i>
              ข้อมูลจาก USGS
            </div>
          </div>
        `);
      },
    }).addTo(this.quakesLayer);
  }
}
