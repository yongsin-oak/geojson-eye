// Air Quality Manager - จัดการข้อมูลคุณภาพอากาศ
class AirQualityManager {
  constructor(airLayer, uiManager, cacheManager) {
    this.airLayer = airLayer;
    this.uiManager = uiManager;
    this.cacheManager = cacheManager;
    this.currentRegion = DEFAULT_REGION;
  }

  setRegion(region) {
    this.currentRegion = region;
  }

  async loadAirQuality() {
    try {
      this.airLayer.clearLayers();
      const provinces = getProvincesByRegion(this.currentRegion);
      console.log(`กำลังโหลดคุณภาพอากาศ ${provinces.length} จังหวัด...`);

      // ตรวจสอบ cache ก่อน
      if (this.cacheManager.isValid("air", this.currentRegion)) {
        console.log(`ใช้ cache คุณภาพอากาศ (${this.currentRegion})`);
        const cachedCircles = this.cacheManager.get("air", this.currentRegion);
        cachedCircles.forEach((circle) => this.airLayer.addLayer(circle));
        return;
      }

      const promises = provinces.map(async (province) => {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${province.lat}&longitude=${province.lon}&current=pm10,pm2_5,us_aqi`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.current) return null;

        const aqi = Math.round(data.current.us_aqi) || 0;
        const pm25 = Math.round(data.current.pm2_5 * 10) / 10 || 0;
        const pm10 = Math.round(data.current.pm10 * 10) / 10 || 0;

        // กำหนดสีตามระดับ US AQI
        let color = "#10b981";
        let level = "ดี";
        let aqiIcon = "fa-circle-check";

        if (aqi > 200) {
          color = "#9333ea";
          level = "อันตรายมาก";
          aqiIcon = "fa-skull-crossbones";
        } else if (aqi > 150) {
          color = "#dc2626";
          level = "ไม่ดีต่อสุขภาพมาก";
          aqiIcon = "fa-circle-xmark";
        } else if (aqi > 100) {
          color = "#f97316";
          level = "ไม่ดีต่อสุขภาพ";
          aqiIcon = "fa-triangle-exclamation";
        } else if (aqi > 50) {
          color = "#f59e0b";
          level = "ปานกลาง";
          aqiIcon = "fa-circle-info";
        }

        const circle = L.circleMarker([province.lat, province.lon], {
          radius: Math.max(6, Math.min(aqi / 10, 20)),
          fillColor: color,
          color: "#fff",
          weight: 1.5,
          opacity: 0.8,
          fillOpacity: 0.5,
          pane: "airPane",
        });

        circle.bindPopup(`
          <div style="min-width:260px;">
            <div style="text-align:center;margin-bottom:12px;">
              <strong style="font-size:18px;color:#f1f5f9;">${
                province.name
              }</strong>
            </div>
            <div style="background:#1e293b;padding:14px;border-radius:10px;">
              <div style="text-align:center;margin-bottom:12px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">
                  <i class="fa-solid fa-wind" style="color:#06b6d4;margin-right:4px;"></i>
                  ดัชนีคุณภาพอากาศ (AQI)
                </div>
                <div style="font-size:42px;font-weight:700;color:${color};">${aqi}</div>
                <div style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:${color};margin-top:6px;background:#0f172a;padding:6px 14px;border-radius:20px;">
                  <i class="fa-solid ${aqiIcon}"></i>
                  ${level}
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">
                    <i class="fa-solid fa-smog" style="color:#94a3b8;"></i> PM2.5
                  </div>
                  <strong style="color:#f1f5f9;font-size:14px;">${
                    pm25 > 0 ? pm25 : "-"
                  }</strong>
                  <div style="font-size:9px;color:#64748b;">μg/m³</div>
                </div>
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">
                    <i class="fa-solid fa-smog" style="color:#94a3b8;"></i> PM10
                  </div>
                  <strong style="color:#f1f5f9;font-size:14px;">${
                    pm10 > 0 ? pm10 : "-"
                  }</strong>
                  <div style="font-size:9px;color:#64748b;">μg/m³</div>
                </div>
              </div>
            </div>
            <div style="color:#64748b;font-size:10px;margin-top:8px;text-align:center;">
              <i class="fa-solid fa-cloud" style="margin-right:4px;"></i>
              ข้อมูลจาก Open-Meteo
            </div>
          </div>
        `);

        return circle;
      });

      const circles = await Promise.all(promises);
      const validCircles = circles.filter((c) => c !== null);

      validCircles.forEach((circle) => {
        this.airLayer.addLayer(circle);
      });

      this.cacheManager.set("air", this.currentRegion, validCircles);

      console.log(`โหลดคุณภาพอากาศ: ${provinces.length} จังหวัด`);
    } catch (err) {
      console.error("Air Quality API error:", err);
    }
  }
}
