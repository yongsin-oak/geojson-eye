// Province Boundary Manager - จัดการเส้นแบ่งจังหวัด
class ProvinceManager {
  constructor(map, provinceLayer) {
    this.map = map;
    this.provinceLayer = provinceLayer;
  }

  async loadProvinces() {
    try {

      console.log("กำลังโหลดเส้นแบ่งจังหวัด...");
      this.provinceLayer.clearLayers();

      // โหลดไฟล์ provinces.geojson
      const response = await fetch("provinces.geojson");
      const data = await response.json();

      console.log(`โหลดเส้นแบ่งจังหวัด: ${data.features.length} จังหวัด`);

      // สร้าง GeoJSON layer
      L.geoJSON(data, {
        style: (feature) => {
          return {
            color: "#f59e0b", // สีส้มทอง
            weight: 3,
            opacity: 0.7,
            fillColor: "#fbbf24",
            fillOpacity: 0.05,
          };
        },
        onEachFeature: (feature, layer) => {
          // แสดงชื่อเมื่อ hover
          if (feature.properties) {
            const props = feature.properties;
            const provinceName = props.pro_th || props.name || "ไม่ระบุชื่อ";
            const provinceEn = props.pro_en || "";
            const region = props.reg_royin || "";

            // ใช้ tooltip แทน popup เพื่อแสดงชื่อตลอดเวลาที่ชี้
            const tooltipContent = `
              <div style="font-size:14px;font-weight:700;color:#ffffff;background:#1e293b;padding:8px 12px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border-left:3px solid #f59e0b;">
                จ.${provinceName}
                ${
                  provinceEn
                    ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;font-weight:400;">${provinceEn}</div>`
                    : ""
                }
                ${
                  region
                    ? `<div style="font-size:10px;color:#64748b;margin-top:2px;font-weight:400;">ภาค${region}</div>`
                    : ""
                }
              </div>
            `;

            layer.bindTooltip(tooltipContent, {
              permanent: false,
              sticky: true,
              direction: "auto",
              className: "province-tooltip",
              opacity: 1,
            });

            // เพิ่ม highlight เมื่อ hover
            layer.on("mouseover", function (e) {
              const layer = e.target;
              layer.setStyle({
                weight: 4,
                opacity: 0.9,
                fillOpacity: 0.15,
              });
            });

            layer.on("mouseout", function (e) {
              const layer = e.target;
              layer.setStyle({
                weight: 3,
                opacity: 0.7,
                fillOpacity: 0.05,
              });
            });
          }
        },
      }).addTo(this.provinceLayer);

      console.log("โหลดเส้นแบ่งจังหวัดเสร็จสิ้น");
    } catch (err) {
      console.error("Error loading provinces:", err);
      alert("ไม่สามารถโหลดเส้นแบ่งจังหวัดได้: " + err.message);
    }
  }

  clearProvinces() {
    this.provinceLayer.clearLayers();
    console.log("ลบเส้นแบ่งจังหวัดแล้ว");
  }
}
