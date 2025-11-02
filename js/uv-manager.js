// UV Manager - จัดการข้อมูล UV Index
class UVManager {
  constructor(floodLayer, uiManager, cacheManager) {
    this.floodLayer = floodLayer;
    this.uiManager = uiManager;
    this.cacheManager = cacheManager;
    this.currentRegion = DEFAULT_REGION;
  }

  setRegion(region) {
    this.currentRegion = region;
  }

  getUVRiskLevel(uv) {
    if (uv < 3)
      return {
        level: "ต่ำ",
        color: "#22c55e",
        icon: "fa-circle-check",
        advice: "ปลอดภัย ไม่ต้องป้องกันพิเศษ",
      };
    if (uv < 6)
      return {
        level: "ปานกลาง",
        color: "#eab308",
        icon: "fa-triangle-exclamation",
        advice: "ควรใช้ครีมกันแดด",
      };
    if (uv < 8)
      return {
        level: "สูง",
        color: "#f97316",
        icon: "fa-shield",
        advice: "ใช้ครีมกันแดดและหมวก",
      };
    if (uv < 11)
      return {
        level: "สูงมาก",
        color: "#ef4444",
        icon: "fa-exclamation-triangle",
        advice: "หลีกเลี่ยงแดดเที่ยง ป้องกันเต็มที่",
      };
    return {
      level: "อันตราย",
      color: "#991b1b",
      icon: "fa-circle-exclamation",
      advice: "อันตราย! หลีกเลี่ยงแดดทั้งวัน",
    };
  }

  async loadUVIndex() {
    try {
      this.floodLayer.clearLayers();
      const provinces = getProvincesByRegion(this.currentRegion);
      console.log(`⏳ กำลังโหลด UV Index ${provinces.length} จังหวัด...`);

      // ตรวจสอบ cache ก่อน
      if (this.cacheManager.isValid("flood", this.currentRegion)) {
        console.log(`ใช้ cache UV Index (${this.currentRegion})`);
        const cachedCircles = this.cacheManager.get(
          "flood",
          this.currentRegion
        );
        cachedCircles.forEach((circle) => this.floodLayer.addLayer(circle));
        return;
      }

      const promises = provinces.map(async (province) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${province.lat}&longitude=${province.lon}&daily=uv_index_max,uv_index_clear_sky_max&timezone=Asia/Bangkok&forecast_days=1`;
          const res = await fetch(url);
          const data = await res.json();

          if (!data.daily || !data.daily.uv_index_max) return null;

          const uvIndex = data.daily.uv_index_max[0];
          const uvClearSky = data.daily.uv_index_clear_sky_max
            ? data.daily.uv_index_clear_sky_max[0]
            : null;

          if (uvIndex === null || uvIndex === undefined) return null;

          const uvInfo = this.getUVRiskLevel(uvIndex);

          const circle = L.circleMarker([province.lat, province.lon], {
            radius: 8 + uvIndex * 0.8,
            fillColor: uvInfo.color,
            color: "#fff",
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.6,
            pane: "floodPane",
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
                    <i class="fa-solid fa-sun" style="color:#fbbf24;margin-right:4px;"></i>
                    UV Index วันนี้
                  </div>
                  <div style="font-size:42px;font-weight:700;color:${
                    uvInfo.color
                  };">${uvIndex.toFixed(1)}</div>
                  <div style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:${
                    uvInfo.color
                  };margin-top:6px;background:#0f172a;padding:6px 14px;border-radius:20px;">
                    <i class="fa-solid ${uvInfo.icon}"></i>
                    ${uvInfo.level}
                  </div>
                </div>
                ${
                  uvClearSky !== null
                    ? `
                <div style="background:#0f172a;padding:10px;border-radius:8px;margin-bottom:10px;text-align:center;">
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">
                    <i class="fa-solid fa-cloud-sun" style="margin-right:4px;"></i>
                    UV (ท้องฟ้าแจ่มใส)
                  </div>
                  <strong style="color:#f1f5f9;font-size:16px;">${uvClearSky.toFixed(
                    1
                  )}</strong>
                </div>
                `
                    : ""
                }
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
                    <i class="fa-solid fa-lightbulb" style="color:#fbbf24;margin-right:4px;"></i>
                    ${uvInfo.advice}
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
        } catch (err) {
          console.error(`ไม่สามารถโหลด UV Index: ${province.name}`, err);
          return null;
        }
      });

      const circles = await Promise.all(promises);
      const validCircles = circles.filter((c) => c !== null);

      validCircles.forEach((circle) => {
        if (circle) this.floodLayer.addLayer(circle);
      });

      this.cacheManager.set("flood", this.currentRegion, validCircles);

      console.log(`โหลด UV Index: ${provinces.length} จังหวัด`);
    } catch (err) {
      console.error("UV Index API error:", err);
    }
  }
}
