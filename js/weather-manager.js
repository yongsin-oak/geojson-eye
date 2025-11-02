/*
  Weather Manager (บทสรุปภาษาไทย)
  - รับผิดชอบการดึงข้อมูลสภาพอากาศจาก Open-Meteo
  - แปลงข้อมูลเป็น marker/tooltip บนแผนที่ และแสดงรายละเอียดเมื่อคลิก
  - เหมาะสำหรับผู้ใช้งานที่ต้องการดูสภาพอากาศปัจจุบันและพยากรณ์รายชั่วโมง
*/
// Weather Layer Manager
// Handles weather forecast data from Open-Meteo API

class WeatherManager {
  constructor(weatherLayer, uiManager, cacheManager) {
    this.weatherLayer = weatherLayer;
    this.uiManager = uiManager;
    this.cacheManager = cacheManager;
    this.currentRegion = "central";
  }

  setRegion(region) {
    this.currentRegion = region;
  }

  getWeatherDesc(code) {
    if (code === 0) return "แจ่มใส";
    if (code <= 3) return "มีเมฆบางส่วน";
    if (code <= 48) return "หมอก";
    if (code <= 57) return "ฝนตกปรอย";
    if (code <= 67) return "ฝนตก";
    if (code <= 77) return "หิมะ";
    if (code <= 82) return "ฝนตกหนัก";
    if (code <= 86) return "ฝนและหิมะ";
    if (code >= 95) return "พายุฝนฟ้าคะนอง";
    return "เมฆบางส่วน";
  }

  async loadWeatherForecast() {
    try {
      this.weatherLayer.clearLayers();

      const provinces = getProvincesByRegion(this.currentRegion);
      console.log(`กำลังโหลดสภาพอากาศ ${provinces.length} จังหวัด...`);

      // Check cache
      if (this.cacheManager.isValid("weather", this.currentRegion)) {
        console.log(`ใช้ cache สภาพอากาศ (${this.currentRegion})`);
        const cachedMarkers = this.cacheManager.get(
          "weather",
          this.currentRegion
        );
        cachedMarkers.forEach((marker) => this.weatherLayer.addLayer(marker));
        return;
      }

      const promises = provinces.map(async (province) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${province.lat}&longitude=${province.lon}&current=temperature_2m,precipitation,weathercode,windspeed_10m,relativehumidity_2m&hourly=temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m&timezone=Asia/Bangkok&forecast_days=2`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.current) return null;

        const temp = Math.round(data.current.temperature_2m);
        const weatherCode = data.current.weathercode;
        const precipitation = data.current.precipitation || 0;
        const windSpeed = Math.round(data.current.windspeed_10m);
        const humidity = data.current.relativehumidity_2m;
        const updateTime = data.current.time || "N/A";
        const timezone = data.timezone_abbreviation || "GMT+7";
        const weatherDesc = this.getWeatherDesc(weatherCode);

        // Build hourly forecast
        let hourlyForecast = "";
        if (data.hourly && data.hourly.time) {
          hourlyForecast =
            '<div style="margin-top:12px;"><div style="color:#94a3b8;font-size:11px;margin-bottom:8px;font-weight:600;"><i class="fa-regular fa-clock" style="margin-right:4px;"></i>พยากรณ์ 24 ชั่วโมงข้างหน้า</div><div class="hourly-forecast-scroll" style="max-height:180px;overflow-y:auto;"><div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:6px;">';

          for (let i = 0; i < Math.min(24, data.hourly.time.length); i++) {
            const hourTime = data.hourly.time[i];
            const hourTemp = Math.round(data.hourly.temperature_2m[i]);
            const hourPrecipProb =
              data.hourly.precipitation_probability[i] || 0;
            const hourPrecip = data.hourly.precipitation[i] || 0;
            const hourWind = Math.round(data.hourly.windspeed_10m[i]);
            const hourCode = data.hourly.weathercode[i];
            const hourDesc = this.getWeatherDesc(hourCode);
            const hour = new Date(hourTime).getHours();
            const hourDisplay = `${hour.toString().padStart(2, "0")}:00`;

            hourlyForecast += `
              <div style="background:#1e293b;padding:8px;border-radius:6px;border:1px solid rgba(148, 163, 184, 0.1);">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;font-weight:600;">${hourDisplay}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span style="font-size:14px;font-weight:700;color:#f1f5f9;">${hourTemp}°C</span>
                  <span style="font-size:9px;color:#60a5fa;">${hourDesc}</span>
                </div>
                <div style="font-size:9px;color:#94a3b8;margin-bottom:2px;">
                  <i class="fa-solid fa-droplet" style="color:#3b82f6;width:12px;"></i> ${hourPrecipProb}% (${hourPrecip.toFixed(
              1
            )}mm)
                </div>
                <div style="font-size:9px;color:#94a3b8;">
                  <i class="fa-solid fa-wind" style="color:#06b6d4;width:12px;"></i> ${hourWind} km/h
                </div>
              </div>`;
          }
          hourlyForecast += "</div></div></div>";
        }

        const marker = L.marker([province.lat, province.lon], {
          icon: L.divIcon({
            html: `
              <div style="text-align:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:8px;padding:4px 6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);">
                <div style="font-size:16px;font-weight:700;color:#ffffff;">${temp}°</div>
                <div style="font-size:8px;color:#e0e7ff;margin-top:0px;">${province.name}</div>
              </div>
            `,
            className: "weather-marker",
            iconSize: [60, 40],
            iconAnchor: [30, 20],
          }),
          pane: "weatherPane",
        });

        marker.bindPopup(`
          <div style="min-width:300px;max-width:340px;">
            <div style="text-align:center;margin-bottom:12px;">
              <strong style="font-size:18px;color:#f1f5f9;">${
                province.name
              }</strong>
              <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
                <i class="fa-regular fa-clock" style="margin-right:4px;"></i>
                ${updateTime} (${timezone})
              </div>
            </div>
            <div style="background:#1e293b;padding:14px;border-radius:10px;">
              <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;margin-bottom:12px;">
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:4px;">
                    <i class="fa-solid fa-temperature-three-quarters" style="color:#ef4444;"></i> อุณหภูมิ
                  </div>
                  <strong style="font-size:26px;color:#f1f5f9;">${temp}°C</strong>
                </div>
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:4px;">
                    <i class="fa-solid fa-cloud-sun" style="color:#60a5fa;"></i> สภาพอากาศ
                  </div>
                  <strong style="color:#e2e8f0;font-size:12px;">${weatherDesc}</strong>
                </div>
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:4px;">
                    <i class="fa-solid fa-droplet" style="color:#3b82f6;"></i> ความชื้น
                  </div>
                  <strong style="color:#f1f5f9;font-size:14px;">${humidity}%</strong>
                </div>
                <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:4px;">
                    <i class="fa-solid fa-wind" style="color:#06b6d4;"></i> ความเร็วลม
                  </div>
                  <strong style="color:#f1f5f9;font-size:14px;">${windSpeed} km/h</strong>
                </div>
              </div>
              <div style="background:#0f172a;padding:10px;border-radius:8px;text-align:center;">
                <div style="color:#94a3b8;font-size:10px;margin-bottom:4px;">
                  <i class="fa-solid fa-cloud-rain" style="color:${
                    precipitation > 0 ? "#60a5fa" : "#22c55e"
                  };"></i> ปริมาณฝน
                </div>
                <strong style="color:${
                  precipitation > 0 ? "#60a5fa" : "#22c55e"
                };font-size:14px;">${
          precipitation > 0 ? precipitation.toFixed(1) : "0.0"
        } mm</strong>
              </div>
              ${hourlyForecast}
            </div>
            <div style="color:#64748b;font-size:10px;margin-top:8px;text-align:center;">
              <i class="fa-solid fa-cloud" style="margin-right:4px;"></i>
              ข้อมูลจาก Open-Meteo
            </div>
          </div>
        `);

        return marker;
      });

      const markers = await Promise.all(promises);
      const validMarkers = markers.filter((m) => m !== null);

      validMarkers.forEach((marker) => {
        if (marker) this.weatherLayer.addLayer(marker);
      });

      this.cacheManager.set("weather", this.currentRegion, validMarkers);
      console.log(`โหลดสภาพอากาศปัจจุบัน: ${provinces.length} จังหวัด`);
    } catch (err) {
      console.error("Current Weather API error:", err);
    }
  }
}
