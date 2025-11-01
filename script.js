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
  map.createPane("weatherPane");
  map.createPane("floodPane");
  map.createPane("airPane");
  map.createPane("quakesPane");

  map.getPane("hospitalPane").style.zIndex = 650;
  map.getPane("weatherPane").style.zIndex = 640;
  map.getPane("floodPane").style.zIndex = 630;
  map.getPane("airPane").style.zIndex = 620;
  map.getPane("quakesPane").style.zIndex = 610;

  const hospitalsLayer = L.layerGroup([], { pane: "hospitalPane" });
  const weatherLayer = L.layerGroup([], { pane: "weatherPane" });
  const floodLayer = L.layerGroup([], { pane: "floodPane" });
  const airLayer = L.layerGroup([], { pane: "airPane" });
  const quakesLayer = L.layerGroup([], { pane: "quakesPane" });

  const hospitalManager = new HospitalManager(map, hospitalsLayer, uiManager);
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

  const form = document.getElementById("hospital-form");
  const msg = document.getElementById("form-msg");
  const formCancelBtn = document.getElementById("form-cancel");

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

  map.on("popupopen", function (e) {
    const container = e.popup.getElement();
    if (!container) return;

    const editBtn = container.querySelector(".edit-hospital");
    const delBtn = container.querySelector(".delete-hospital");

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const fid = editBtn.dataset.fid;
        const feature = hospitalManager.getFeature(fid);
        if (!feature) return alert("ไม่พบข้อมูล");

        form.elements["name_th"].value = feature.properties.name_th || "";
        form.elements["name_en"].value = feature.properties.name_en || "";
        form.elements["district"].value = feature.properties.district || "";
        form.elements["address"].value = feature.properties.address || "";

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
});
