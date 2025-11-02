// Main Application - ไฟล์นี้เป็น entry point เท่านั้น ใช้ managers ทั้งหมด

document.addEventListener("DOMContentLoaded", function () {
  const map = L.map("map", { zoomControl: true }).setView([16.8, 100.26], 10);

  const baseLayers = {
    แผนที่ถนน: L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: "© OpenStreetMap" }
    ),
    แผนที่ภูมิศาสตร์: L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      { maxZoom: 17, attribution: "© OpenTopoMap" }
    ),
    แผนที่ดาวเทียม: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "© Esri" }
    ),
    "CartoDB Dark": L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, attribution: "© CartoDB" }
    ),
  };
  baseLayers["แผนที่ถนน"].addTo(map);

  let currentRegion = DEFAULT_REGION;
  const regionSelector = document.getElementById("region-selector");
  if (regionSelector) regionSelector.value = DEFAULT_REGION;

  map.createPane("hospitalPane");
  map.createPane("studentPane");
  map.createPane("provincePane");
  map.createPane("districtPane");
  map.createPane("weatherPane");
  map.createPane("floodPane");
  map.createPane("airPane");
  map.createPane("quakesPane");

  map.getPane("hospitalPane").style.zIndex = 650;
  map.getPane("studentPane").style.zIndex = 645;
  map.getPane("provincePane").style.zIndex = 390;
  map.getPane("districtPane").style.zIndex = 400;
  map.getPane("weatherPane").style.zIndex = 640;
  map.getPane("floodPane").style.zIndex = 630;
  map.getPane("airPane").style.zIndex = 620;
  map.getPane("quakesPane").style.zIndex = 610;

  const hospitalsLayer = L.layerGroup([], { pane: "hospitalPane" });
  const studentsLayer = L.layerGroup([], { pane: "studentPane" });
  const provinceLayer = L.layerGroup([], { pane: "provincePane" });
  const districtLayer = L.layerGroup([], { pane: "districtPane" });
  const weatherLayer = L.layerGroup([], { pane: "weatherPane" });
  const floodLayer = L.layerGroup([], { pane: "floodPane" });
  const airLayer = L.layerGroup([], { pane: "airPane" });
  const quakesLayer = L.layerGroup([], { pane: "quakesPane" });

  const hospitalManager = new HospitalManager(map, hospitalsLayer, uiManager);
  const studentManager = new StudentManager(map, studentsLayer, uiManager);
  const provinceManager = new ProvinceManager(map, provinceLayer);
  const districtManager = new DistrictManager(map, districtLayer);
  const weatherManager = new WeatherManager(
    weatherLayer,
    uiManager,
    cacheManager
  );
  const uvManager = new UVManager(floodLayer, uiManager, cacheManager);
  const airQualityManager = new AirQualityManager(
    airLayer,
    uiManager,
    cacheManager
  );
  const earthquakeManager = new EarthquakeManager(
    quakesLayer,
    uiManager,
    cacheManager
  );

  if (regionSelector) {
    regionSelector.addEventListener("change", (e) => {
      currentRegion = e.target.value;
      weatherManager.setRegion(currentRegion);
      uvManager.setRegion(currentRegion);
      airQualityManager.setRegion(currentRegion);
      if (map.hasLayer(weatherLayer)) weatherManager.loadWeatherForecast();
      if (map.hasLayer(floodLayer)) uvManager.loadUVIndex();
      if (map.hasLayer(airLayer)) airQualityManager.loadAirQuality();
    });
  }

  const LayerToggleControl = L.Control.extend({
    options: { position: "topright" },
    onAdd: function (map) {
      const container = L.DomUtil.create(
        "div",
        "leaflet-bar leaflet-control layer-toggle-buttons"
      );
      container.style.cssText =
        "background:transparent;border:none;display:flex;flex-direction:column;gap:8px;";

      const layers = [
        {
          name: `<i class="fa-solid fa-hospital"></i>`,
          title: "โรงพยาบาล",
          key: "hospitals",
          layer: hospitalsLayer,
          loadFn: () => hospitalManager.loadHospitals(),
        },
        {
          name: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;">
            <circle cx="12" cy="12" r="11" stroke="white" stroke-width="2"/>
            <path d="M12 6C10.34 6 9 7.34 9 9C9 10.66 10.34 12 12 12C13.66 12 15 10.66 15 9C15 7.34 13.66 6 12 6Z" fill="white"/>
            <path d="M12 13C9.33 13 7 14.34 7 16V18H17V16C17 14.34 14.67 13 12 13Z" fill="white"/>
          </svg>`,
          title: "นักเรียน",
          key: "students",
          layer: studentsLayer,
          loadFn: () => studentManager.loadStudents(),
        },
        {
          name: `<i class="fa-solid fa-map-location-dot"></i>`,
          title: "เส้นแบ่งจังหวัด",
          key: "provinces",
          layer: provinceLayer,
          loadFn: () => provinceManager.loadProvinces(),
        },
        {
          name: `<i class="fa-solid fa-map"></i>`,
          title: "เส้นแบ่งอำเภอ",
          key: "districts",
          layer: districtLayer,
          loadFn: () => districtManager.loadDistricts(),
        },
        {
          name: `<i class="fa-solid fa-cloud"></i>`,
          title: "สภาพอากาศปัจจุบัน",
          key: "weather",
          layer: weatherLayer,
          loadFn: () => weatherManager.loadWeatherForecast(),
        },
        {
          name: `<i class="fa-solid fa-sun"></i>`,
          title: "UV Index",
          key: "flood",
          layer: floodLayer,
          loadFn: () => uvManager.loadUVIndex(),
        },
        {
          name: `<i class="fa-solid fa-wind"></i>`,
          title: "คุณภาพอากาศ",
          key: "air",
          layer: airLayer,
          loadFn: () => airQualityManager.loadAirQuality(),
        },
        {
          name: `<i class="fa-solid fa-house-crack"></i>`,
          title: "แผ่นดินไหว",
          key: "quakes",
          layer: quakesLayer,
          loadFn: () => earthquakeManager.loadEarthquakes(),
        },
      ];

      layers.forEach((item) => {
        const button = L.DomUtil.create("a", "layer-toggle-btn", container);
        button.href = "#";
        button.title = item.title;
        button.innerHTML = item.name;
        button.style.cssText = `width:44px;height:44px;background:linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95));border:1px solid rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;color:white;cursor:pointer;transition:all 0.2s ease;text-decoration:none;backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,0.3);`;

        if (item.key === "hospitals") {
          button.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
          button.dataset.active = "true";
          uiManager.setLayerState("hospitals", true);
          map.addLayer(hospitalsLayer);
          setTimeout(() => {
            item.loadFn();
            setTimeout(() => uiManager.updateActiveLayersDisplay(), 200);
          }, 100);
        } else {
          button.dataset.active = "false";
          uiManager.setLayerState(item.key, false);
        }

        L.DomEvent.on(button, "click", function (e) {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stopPropagation(e);
          const isActive = button.dataset.active === "true";

          if (isActive) {
            map.removeLayer(item.layer);
            item.layer.clearLayers();
            button.style.background =
              "linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))";
            button.dataset.active = "false";
            uiManager.setLayerState(item.key, false);
          } else {
            item.layer.addTo(map);
            button.style.background =
              "linear-gradient(135deg, #667eea, #764ba2)";
            button.dataset.active = "true";
            uiManager.setLayerState(item.key, true);
            if (item.loadFn) item.loadFn();
          }
          uiManager.updateActiveLayersDisplay();
        });

        L.DomEvent.on(button, "mouseenter", function () {
          if (button.dataset.active === "false") {
            button.style.background =
              "linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))";
          }
        });

        L.DomEvent.on(button, "mouseleave", function () {
          if (button.dataset.active === "false") {
            button.style.background =
              "linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))";
          }
        });
      });

      return container;
    },
  });

  map.addControl(new LayerToggleControl());
  L.control
    .layers(baseLayers, null, { position: "topleft", collapsed: true })
    .addTo(map);

  const filterSelect = document.getElementById("filter-district");
  const formSelect = document.getElementById("form-district");
  if (filterSelect && formSelect) {
    DISTRICTS.forEach((d) => {
      const opt1 = document.createElement("option");
      opt1.value = d.districtNameTh;
      opt1.textContent = d.districtNameTh;
      filterSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = d.districtNameTh;
      opt2.textContent = d.districtNameTh;
      formSelect.appendChild(opt2);
    });

    if (filterSelect.value === "") filterSelect.classList.add("is-empty");
    if (formSelect.value === "") formSelect.classList.add("is-empty");

    filterSelect.addEventListener("change", () => {
      filterSelect.classList.toggle("is-empty", filterSelect.value === "");
    });
    formSelect.addEventListener("change", () => {
      formSelect.classList.toggle("is-empty", formSelect.value === "");
    });
  }

  const filterName = document.getElementById("filter-name");
  const filterDistrict = document.getElementById("filter-district");
  const btnApplyFilter = document.getElementById("btn-apply-filter");
  const btnClearFilter = document.getElementById("btn-clear-filter");

  if (btnApplyFilter) {
    btnApplyFilter.addEventListener("click", () => {
      const name = filterName ? filterName.value.trim() : "";
      const district = filterDistrict ? filterDistrict.value.trim() : "";
      hospitalManager.loadHospitals({ name, district });
    });
  }

  if (btnClearFilter) {
    btnClearFilter.addEventListener("click", () => {
      if (filterName) filterName.value = "";
      if (filterDistrict) filterDistrict.value = "";
      if (filterDistrict) filterDistrict.classList.add("is-empty");
      hospitalManager.loadHospitals();
    });
  }

  // Student Filter Controls
  const studentFilterName = document.getElementById("student-filter-name");
  const studentFilterId = document.getElementById("student-filter-id");
  const btnApplyStudentFilter = document.getElementById(
    "btn-apply-student-filter"
  );
  const btnClearStudentFilter = document.getElementById(
    "btn-clear-student-filter"
  );

  if (btnApplyStudentFilter) {
    btnApplyStudentFilter.addEventListener("click", () => {
      const name = studentFilterName ? studentFilterName.value.trim() : "";
      const id = studentFilterId ? studentFilterId.value.trim() : "";
      studentManager.loadStudents({ name, id });
    });
  }

  if (btnClearStudentFilter) {
    btnClearStudentFilter.addEventListener("click", () => {
      if (studentFilterName) studentFilterName.value = "";
      if (studentFilterId) studentFilterId.value = "";
      studentManager.loadStudents();
    });
  }

  const form = document.getElementById("hospital-form");
  const msg = document.getElementById("form-msg");
  const formCancelBtn = document.getElementById("form-cancel");

  const studentForm = document.getElementById("student-form");
  const studentMsg = document.getElementById("student-form-msg");
  const studentFormCancelBtn = document.getElementById("student-form-cancel");

  if (form && formCancelBtn) {
    formCancelBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("form-mode").value = "insert";
      document.getElementById("form-fid").value = "";
      document.getElementById("form-submit").textContent = "เพิ่มโรงพยาบาล";
      formCancelBtn.style.display = "none";
      if (formSelect) formSelect.classList.add("is-empty");
      if (msg) msg.textContent = "";
    });
  }

  if (studentForm && studentFormCancelBtn) {
    studentFormCancelBtn.addEventListener("click", () => {
      studentForm.reset();
      document.getElementById("student-form-mode").value = "insert";
      document.getElementById("student-form-fid").value = "";
      document.getElementById("student-form-submit").textContent =
        "Add Student";
      studentFormCancelBtn.style.display = "none";
      if (studentMsg) studentMsg.textContent = "";
    });
  }

  map.on("popupopen", function (e) {
    const container = e.popup.getElement();
    if (!container) return;

    const editBtn = container.querySelector(".edit-hospital");
    const delBtn = container.querySelector(".delete-hospital");
    const editStudentBtn = container.querySelector(".edit-student");
    const delStudentBtn = container.querySelector(".delete-student");

    // Handle Student Edit
    if (editStudentBtn) {
      editStudentBtn.addEventListener("click", () => {
        const fid = editStudentBtn.dataset.fid;
        const feature = studentManager.getFeature(fid);
        if (!feature) return alert("ไม่พบข้อมูล");

        studentForm.elements["s_id"].value = feature.properties.s_id || "";
        studentForm.elements["s_name"].value = feature.properties.s_name || "";
        studentForm.elements["curriculum"].value =
          feature.properties.curriculum || "";
        studentForm.elements["department"].value =
          feature.properties.department || "";
        studentForm.elements["faculty"].value =
          feature.properties.faculty || "";
        studentForm.elements["graduated_from"].value =
          feature.properties.graduated_from || "";
        studentForm.elements["subdistrict"].value =
          feature.properties.subdistrict || "";
        studentForm.elements["district"].value =
          feature.properties.district || "";
        studentForm.elements["province"].value =
          feature.properties.province || "";

        if (feature.geometry && feature.geometry.coordinates) {
          studentForm.elements["lat"].value = feature.geometry.coordinates[1];
          studentForm.elements["lon"].value = feature.geometry.coordinates[0];
        }

        document.getElementById("student-form-mode").value = "update";
        document.getElementById("student-form-fid").value = fid;
        document.getElementById("student-form-submit").textContent =
          "บันทึกการแก้ไข";
        studentFormCancelBtn.style.display = "inline-block";
        map.closePopup();
      });
    }

    // Handle Student Delete
    if (delStudentBtn) {
      delStudentBtn.addEventListener("click", async () => {
        const fid = delStudentBtn.dataset.fid;
        if (!confirm("ลบรายการนี้จริงหรือไม่?")) return;

        try {
          await geoServerAPI.deleteStudent(fid);
          studentMsg.textContent = "ลบเรียบร้อย";
          studentMsg.style.color = "#10b981";
          setTimeout(() => {
            studentMsg.textContent = "";
          }, 3000);
          await studentManager.loadStudents();
        } catch (err) {
          studentMsg.textContent = "ลบไม่สำเร็จ: " + err.message;
          studentMsg.style.color = "#ef4444";
        }
      });
    }

    // Handle Hospital Edit
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const fid = editBtn.dataset.fid;
        const feature = hospitalManager.getFeature(fid);
        if (!feature) return alert("ไม่พบข้อมูล");

        form.elements["name_th"].value = feature.properties.name_th || "";
        form.elements["name_en"].value = feature.properties.name_en || "";
        form.elements["district"].value = feature.properties.district || "";
        form.elements["address"].value = feature.properties.address || "";
        form.elements["source"].value = feature.properties.source || "";

        if (feature.geometry && feature.geometry.coordinates) {
          form.elements["lat"].value = feature.geometry.coordinates[1];
          form.elements["lon"].value = feature.geometry.coordinates[0];
        }

        document.getElementById("form-mode").value = "update";
        document.getElementById("form-fid").value = fid;
        document.getElementById("form-submit").textContent = "บันทึกการแก้ไข";
        formCancelBtn.style.display = "inline-block";
        if (formSelect)
          formSelect.classList.toggle("is-empty", formSelect.value === "");
        map.closePopup();
      });
    }

    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        const fid = delBtn.dataset.fid;
        if (!confirm("ลบรายการนี้จริงหรือไม่?")) return;

        try {
          await geoServerAPI.deleteHospital(fid);
          msg.textContent = "ลบเรียบร้อย";
          msg.style.color = "#10b981";
          setTimeout(() => {
            msg.textContent = "";
          }, 3000);
          await hospitalManager.loadHospitals();
        } catch (err) {
          msg.textContent = "ลบไม่สำเร็จ: " + err.message;
          msg.style.color = "#ef4444";
        }
      });
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const properties = {
      name_th: data.get("name_th") || "",
      name_en: data.get("name_en") || "",
      district: data.get("district") || "",
      address: data.get("address") || "",
      source: data.get("source") || "",
    };
    const lat = parseFloat(data.get("lat"));
    const lon = parseFloat(data.get("lon"));
    const coordinates = [lon, lat];
    const mode = data.get("mode") || "insert";
    const fid = data.get("fid") || "";

    try {
      if (mode === "insert") {
        await geoServerAPI.insertHospital(properties, coordinates);
        msg.textContent = "เพิ่มโรงพยาบาลเรียบร้อย ✓";
      } else {
        await geoServerAPI.updateHospital(fid, properties, coordinates);
        msg.textContent = "แก้ไขเรียบร้อย ✓";
      }
      msg.style.color = "#10b981";

      form.reset();
      document.getElementById("form-mode").value = "insert";
      document.getElementById("form-fid").value = "";
      document.getElementById("form-submit").textContent = "เพิ่มโรงพยาบาล";
      formCancelBtn.style.display = "none";
      if (formSelect) formSelect.classList.add("is-empty");

      setTimeout(() => {
        msg.textContent = "";
      }, 3000);
      await hospitalManager.loadHospitals();
    } catch (err) {
      msg.textContent = "เกิดข้อผิดพลาด: " + err.message;
      msg.style.color = "#ef4444";
    }
  });

  // Student Form Submit
  if (studentForm) {
    studentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(studentForm);
      const properties = {
        s_id: data.get("s_id") || "",
        s_name: data.get("s_name") || "",
        curriculum: data.get("curriculum") || "",
        department: data.get("department") || "",
        faculty: data.get("faculty") || "",
        graduated_from: data.get("graduated_from") || "",
        subdistrict: data.get("subdistrict") || "",
        district: data.get("district") || "",
        province: data.get("province") || "",
      };
      const lat = parseFloat(data.get("lat"));
      const lon = parseFloat(data.get("lon"));
      const coordinates = [lon, lat];
      const mode = data.get("mode") || "insert";
      const fid = data.get("fid") || "";

      try {
        if (mode === "insert") {
          await geoServerAPI.insertStudent(properties, coordinates);
          studentMsg.textContent = "เพิ่มนักเรียนเรียบร้อย ✓";
        } else {
          await geoServerAPI.updateStudent(fid, properties, coordinates);
          studentMsg.textContent = "แก้ไขเรียบร้อย ✓";
        }
        studentMsg.style.color = "#10b981";

        studentForm.reset();
        document.getElementById("student-form-mode").value = "insert";
        document.getElementById("student-form-fid").value = "";
        document.getElementById("student-form-submit").textContent =
          "Add Student";
        studentFormCancelBtn.style.display = "none";

        setTimeout(() => {
          studentMsg.textContent = "";
        }, 3000);
        await studentManager.loadStudents();
      } catch (err) {
        studentMsg.textContent = "เกิดข้อผิดพลาด: " + err.message;
        studentMsg.style.color = "#ef4444";
      }
    });
  }
});
