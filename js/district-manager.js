// District Boundary Manager - จัดการเส้นแบ่งอำเภอ
class DistrictManager {
  constructor(map, districtLayer) {
    this.map = map;
    this.districtLayer = districtLayer;
  }

  async loadDistricts() {
    try {

      console.log("กำลังโหลดเส้นแบ่งอำเภอ...");
      this.districtLayer.clearLayers();

      // โหลดไฟล์ districts.geojson
      const response = await fetch("districts.geojson");
      const data = await response.json();

      console.log(`โหลดเส้นแบ่งอำเภอ: ${data.features.length} อำเภอ`);

      // สร้าง GeoJSON layer
      L.geoJSON(data, {
        style: (feature) => {
          return {
            color: "#6366f1", // สีม่วงน้ำเงิน
            weight: 2,
            opacity: 0.6,
            fillColor: "#4f46e5",
            fillOpacity: 0.1,
          };
        },
        onEachFeature: (feature, layer) => {
          // แสดงชื่อเมื่อ hover
          if (feature.properties) {
            const props = feature.properties;
            const districtName = props.amp_th || props.name || "ไม่ระบุชื่อ";
            const provinceName = props.pro_th || "";

            // ใช้ tooltip แทน popup เพื่อแสดงชื่อตลอดเวลาที่ชี้
            const tooltipContent = `
              <div style="font-size:13px;font-weight:600;color:#ffffff;background:#1e293b;padding:6px 10px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
                อ.${districtName}
                ${
                  provinceName
                    ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">จ.${provinceName}</div>`
                    : ""
                }
              </div>
            `;

            layer.bindTooltip(tooltipContent, {
              permanent: false,
              sticky: true,
              direction: "auto",
              className: "district-tooltip",
              opacity: 1,
            });

            // เพิ่ม highlight เมื่อ hover
            layer.on("mouseover", function (e) {
              const layer = e.target;
              layer.setStyle({
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.2,
              });
            });

            layer.on("mouseout", function (e) {
              const layer = e.target;
              layer.setStyle({
                weight: 2,
                opacity: 0.6,
                fillOpacity: 0.1,
              });
            });
          }
        },
      }).addTo(this.districtLayer);

      console.log("โหลดเส้นแบ่งอำเภอเสร็จสิ้น");
    } catch (err) {
      console.error("Error loading districts:", err);
      alert("ไม่สามารถโหลดเส้นแบ่งอำเภอได้: " + err.message);
    }
  }

  clearDistricts() {
    this.districtLayer.clearLayers();
    console.log("ลบเส้นแบ่งอำเภอแล้ว");
  }
}
