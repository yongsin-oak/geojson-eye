// Student Manager - จัดการข้อมูลนักเรียน
class StudentManager {
  constructor(map, studentsLayer, uiManager) {
    this.map = map;
    this.studentsLayer = studentsLayer;
    this.uiManager = uiManager;
    this.features = [];
  }

  async loadStudents(filter = null) {
    try {
      console.log("กำลังโหลดข้อมูลนักเรียน...", filter);
      this.studentsLayer.clearLayers();

      const data = await geoServerAPI.fetchStudents(filter);
      console.log(`โหลดนักเรียน: ${data.features.length} คน`);

      this.features = data.features;

      // Apply client-side filtering if needed
      let filteredFeatures = data.features;
      if (filter) {
        filteredFeatures = data.features.filter((feature) => {
          const props = feature.properties;
          let match = true;

          // Filter by name
          if (filter.name) {
            const name = (props.s_name || "").toLowerCase();
            match = match && name.includes(filter.name.toLowerCase());
          }

          // Filter by student ID
          if (filter.id) {
            const id = (props.s_id || "").toLowerCase();
            match = match && id.includes(filter.id.toLowerCase());
          }

          return match;
        });
        console.log(`กรองเหลือ: ${filteredFeatures.length} คน`);
      }

      filteredFeatures.forEach((feature) => {
        const coords = feature.geometry.coordinates;
        const props = feature.properties;

        const marker = L.marker([coords[1], coords[0]], {
          icon: L.divIcon({
            html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">
              <i class="fa-solid fa-user" style="color:white;font-size:16px;"></i>
            </div>`,
            className: "student-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
          pane: "studentPane",
        });

        const popupContent = `
          <div style="min-width:250px;background:#1e293b;padding:12px;border-radius:8px;">
            <h3 style="margin:0 0 10px 0;padding-bottom:8px;border-bottom:2px solid #3b82f6;color:#ffffff;font-size:15px;font-weight:700;">
              <i class="fa-solid fa-user" style="color:#3b82f6;margin-right:6px;"></i>
              ${props.s_name || "ไม่ระบุชื่อ"}
            </h3>
            <table style="width:100%;font-size:13px;color:#f1f5f9;line-height:1.6;">
              <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#ffffff;">รหัส:</td><td style="padding:4px 0;color:#e2e8f0;">${
                props.s_id || "-"
              }</td></tr>
              <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#ffffff;">หลักสูตร:</td><td style="padding:4px 0;color:#e2e8f0;">${
                props.curriculum || "-"
              }</td></tr>
              <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#ffffff;">ภาควิชา:</td><td style="padding:4px 0;color:#e2e8f0;">${
                props.department || "-"
              }</td></tr>
              <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#ffffff;">คณะ:</td><td style="padding:4px 0;color:#e2e8f0;">${
                props.faculty || "-"
              }</td></tr>
              <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#ffffff;">จบจาก:</td><td style="padding:4px 0;color:#e2e8f0;">${
                props.graduated_from || "-"
              }</td></tr>
              <tr><td style="padding:4px 8px 4px 0;font-weight:600;color:#ffffff;">ที่อยู่:</td><td style="padding:4px 0;color:#e2e8f0;">${
                props.subdistrict || ""
              } ${props.district || ""} ${props.province || ""}</td></tr>
            </table>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #cbd5e1;display:flex;gap:8px;">
              <button class="edit-student" data-fid="${
                feature.id
              }" style="flex:1;padding:8px 12px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">แก้ไข</button>
              <button class="delete-student" data-fid="${
                feature.id
              }" style="flex:1;padding:8px 12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">ลบ</button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        this.studentsLayer.addLayer(marker);
      });
    } catch (err) {
      console.error("Error loading students:", err);
      alert("ไม่สามารถโหลดข้อมูลนักเรียนได้: " + err.message);
    }
  }

  getFeature(fid) {
    return this.features.find((f) => f.id === fid);
  }

  async addStudent(properties, coordinates) {
    try {
      await geoServerAPI.insertStudent(properties, coordinates);
      await this.loadStudents();
      return { success: true };
    } catch (err) {
      console.error("Error adding student:", err);
      throw err;
    }
  }

  async updateStudent(fid, properties, coordinates) {
    try {
      await geoServerAPI.updateStudent(fid, properties, coordinates);
      await this.loadStudents();
      return { success: true };
    } catch (err) {
      console.error("Error updating student:", err);
      throw err;
    }
  }

  async deleteStudent(fid) {
    try {
      await geoServerAPI.deleteStudent(fid);
      await this.loadStudents();
      return { success: true };
    } catch (err) {
      console.error("Error deleting student:", err);
      throw err;
    }
  }
}
