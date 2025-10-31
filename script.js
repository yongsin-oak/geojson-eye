// Basic Leaflet map & UI wiring for demo layers and left-menu interactions
// You can replace the demo layers with your GeoJSON layers later.

// Wait for DOM
document.addEventListener("DOMContentLoaded", function () {
  // Initialize map
  const map = L.map("map", { zoomControl: true }).setView(
    [13.736717, 100.523186],
    6
  ); // Thailand center

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Simplified: only hospitals WFS layer remains per request.
  const chkHospitals = document.getElementById("layer-hospitals");
  let hospitalsLayer = L.layerGroup();

  // Center the map as requested (Phitsanulok area example)
  map.setView([16.8, 100.26], 10);

  const hospitalsWfsUrl =
    "http://localhost:8080/geoserver/hospital_ws/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=hospital_ws:hospitals&outputFormat=application/json";

  // We'll load hospitals through a function so we can reload after WFS-T operations
  const fidToFeature = new Map();

  function buildPopupContent(feature) {
    const p = feature.properties || {};
    const label = p.name_th || p.name_en || p.name || "โรงพยาบาล";
    const district = p.district ? `<div>เขต: ${p.district}</div>` : "";
    const addr = p.address || p.addr || "";
    const src = p.source
      ? `<div style="font-size:12px;opacity:0.8">แหล่งข้อมูล: ${p.source}</div>`
      : "";
    // include action buttons with fid
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

  // Base WFS endpoint (use for POST GetFeature and WFS-T)
  const hospitalsWfsEndpoint =
    "http://localhost:8080/geoserver/hospital_ws/ows";
  // Load hospitals, optional filterObj: {name, district}
  function escapeCQL(s) {
    if (!s) return "";
    return String(s).replace(/'/g, "''");
  }

  function matchesFilter(feature, filter) {
    if (!filter) return true;
    const p = feature.properties || {};
    if (filter.name) {
      const q = filter.name.toLowerCase();
      const combined = (
        (p.name_th || "") +
        "|" +
        (p.name_en || "") +
        "|" +
        (p.name || "")
      ).toLowerCase();
      if (!combined.includes(q)) return false;
    }
    if (filter.district) {
      const q = filter.district.toLowerCase();
      const d = (p.district || "").toLowerCase();
      if (!d.includes(q)) return false;
    }
    return true;
  }

  // Build a wfs:GetFeature XML containing an OGC filter based on provided filter object
  function buildGetFeatureXml(filter) {
    // helper to escape values for XML
    const esc = (v) => escapeXml(String(v || ""));

    const conditions = [];

    // name: create an OR of PropertyIsLike on name_th / name_en / name
    if (filter && filter.name) {
      const lit = `%${esc(filter.name)}%`;
      const nameLike = [
        `
        <ogc:PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\">
          <ogc:PropertyName>name_th</ogc:PropertyName>
          <ogc:Literal>${lit}</ogc:Literal>
        </ogc:PropertyIsLike>`,
        `
        <ogc:PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\">
          <ogc:PropertyName>name_en</ogc:PropertyName>
          <ogc:Literal>${lit}</ogc:Literal>
        </ogc:PropertyIsLike>`,
      ].join("\n");

      conditions.push(`<ogc:Or>${nameLike}\n</ogc:Or>`);
    }

    // district: use PropertyIsEqualTo (user-provided example) but allow partial by using PropertyIsLike
    if (filter && filter.district) {
      const d = esc(filter.district);
      // use PropertyIsEqualTo for exact match (per example). If you prefer partial, switch to PropertyIsLike.
      conditions.push(`
        <ogc:PropertyIsEqualTo>
          <ogc:PropertyName>district</ogc:PropertyName>
          <ogc:Literal>${d}</ogc:Literal>
        </ogc:PropertyIsEqualTo>`);
    }

    let filterXml = "";
    if (conditions.length === 1) {
      filterXml = conditions[0];
    } else if (conditions.length > 1) {
      filterXml = `<ogc:And>\n${conditions.join("\n")}\n</ogc:And>`;
    }

    // Compose final GetFeature XML. Request JSON output explicitly.
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<wfs:GetFeature service="WFS" version="1.1.0" outputFormat="application/json" xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" xmlns:hos="http://hospital_ws">\n  <wfs:Query typeName="hos:hospitals">\n    <ogc:Filter>\n      ${filterXml}\n    </ogc:Filter>\n  </wfs:Query>\n</wfs:GetFeature>`;

    return xml;
  }

  // District list (Phitsanulok example) - used to populate dropdowns for search and form
  const districts = [
    { id: 684, districtCode: 6501, districtNameTh: "เมืองพิษณุโลก" },
    { id: 685, districtCode: 6502, districtNameTh: "นครไทย" },
    { id: 686, districtCode: 6503, districtNameTh: "ชาติตระการ" },
    { id: 687, districtCode: 6504, districtNameTh: "บางระกำ" },
    { id: 688, districtCode: 6505, districtNameTh: "บางกระทุ่ม" },
    { id: 689, districtCode: 6506, districtNameTh: "พรหมพิราม" },
    { id: 690, districtCode: 6507, districtNameTh: "วัดโบสถ์" },
    { id: 691, districtCode: 6508, districtNameTh: "วังทอง" },
    { id: 692, districtCode: 6509, districtNameTh: "เนินมะปราง" },
  ];

  // Populate district selects in filter and form
  function populateDistrictSelects() {
    const filterSelect = document.getElementById("filter-district");
    const formSelect = document.getElementById("form-district");
    if (!filterSelect || !formSelect) return;
    // Remove existing non-empty options except first
    districts.forEach((d) => {
      const opt1 = document.createElement("option");
      opt1.value = d.districtNameTh;
      opt1.textContent = d.districtNameTh;
      filterSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = d.districtNameTh;
      opt2.textContent = d.districtNameTh;
      formSelect.appendChild(opt2);
    });
    // mark selects as empty (placeholder) when value is blank
    if (filterSelect.value === "") filterSelect.classList.add("is-empty");
    else filterSelect.classList.remove("is-empty");
    if (formSelect.value === "") formSelect.classList.add("is-empty");
    else formSelect.classList.remove("is-empty");

    // toggle class on change so placeholder styling updates
    filterSelect.addEventListener("change", () => {
      filterSelect.classList.toggle("is-empty", filterSelect.value === "");
    });
    formSelect.addEventListener("change", () => {
      formSelect.classList.toggle("is-empty", formSelect.value === "");
    });
  }

  // Load hospitals, optional filterObj: {name, district}
  function loadHospitals(filter) {
    // build CQL filter parts (kept for GET/CQL fallback logging)
    const cqlParts = [];
    if (filter && filter.name) {
      const v = escapeCQL(filter.name);
      cqlParts.push(
        `(name_th ILIKE '%${v}%' OR name_en ILIKE '%${v}%' OR name ILIKE '%${v}%')`
      );
    }
    if (filter && filter.district) {
      const v = escapeCQL(filter.district);
      cqlParts.push(`district ILIKE '%${v}%'`);
    }

    // If we have filter parts, prefer POSTing a wfs:GetFeature with OGC Filter XML
    const usePost = cqlParts.length > 0;

    const getPromise = usePost
      ? // POST GetFeature with XML filter
        fetch(hospitalsWfsEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/xml" },
          body: buildGetFeatureXml(filter),
        }).then((res) => res.json())
      : // fallback: simple GET that requests GeoJSON
        fetch(hospitalsWfsUrl).then((res) => res.json());

    return getPromise
      .then((data) => {
        // NOTE: client-side filtering removed per request. We render server results as-is.
        const features = Array.isArray(data.features) ? data.features : [];
        const filteredGeoJSON = { type: "FeatureCollection", features };

        // clear map layer and fid map
        fidToFeature.clear();
        if (hospitalsLayer) map.removeLayer(hospitalsLayer);

        hospitalsLayer = L.geoJSON(filteredGeoJSON, {
          pointToLayer: (feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 6,
              color: "#c026d3",
              fillColor: "#f0abfc",
              fillOpacity: 0.9,
              weight: 1,
            }),
          onEachFeature: (feature, layer) => {
            const fid =
              feature.id || (feature.properties && feature.properties.id) || "";
            fidToFeature.set(fid, feature);
            layer.bindPopup(buildPopupContent(feature));
          },
        });

        if (chkHospitals && chkHospitals.checked) hospitalsLayer.addTo(map);

        try {
          const b = hospitalsLayer.getBounds();
          if (b && b.isValid && b.isValid()) map.fitBounds(b.pad(0.15));
        } catch (e) {}

        return data;
      })
      .catch((err) => {
        console.error("ไม่สามารถโหลด WFS hospitals:", err);
      });
  }

  // populate selects right after DOM ready
  populateDistrictSelects();

  // initial load
  loadHospitals();

  // Filter UI elements
  const filterName = document.getElementById("filter-name");
  const filterDistrict = document.getElementById("filter-district");
  const btnApplyFilter = document.getElementById("btn-apply-filter");
  const btnClearFilter = document.getElementById("btn-clear-filter");

  if (btnApplyFilter) {
    btnApplyFilter.addEventListener("click", () => {
      const name = filterName ? filterName.value.trim() : "";
      const district = filterDistrict ? filterDistrict.value.trim() : "";
      loadHospitals({ name: name, district: district });
    });
  }
  if (btnClearFilter) {
    btnClearFilter.addEventListener("click", () => {
      if (filterName) filterName.value = "";
      if (filterDistrict) filterDistrict.value = "";
      // ensure placeholder styling updates when clearing
      if (filterDistrict) filterDistrict.classList.add("is-empty");
      loadHospitals();
    });
  }

  // Toggle handler
  function toggleHospitals(enabled) {
    if (!hospitalsLayer) return;
    if (enabled) map.addLayer(hospitalsLayer);
    else map.removeLayer(hospitalsLayer);
  }

  if (chkHospitals) {
    chkHospitals.addEventListener("change", (e) =>
      toggleHospitals(e.target.checked)
    );
  }
  const form = document.getElementById("hospital-form");
  const msg = document.getElementById("form-msg");
  const formCancelBtn = document.getElementById("form-cancel");

  // Attach Cancel button listener once so Cancel always works
  if (form && formCancelBtn) {
    formCancelBtn.addEventListener("click", () => {
      form.reset();
      const modeEl = document.getElementById("form-mode");
      const fidEl = document.getElementById("form-fid");
      if (modeEl) modeEl.value = "insert";
      if (fidEl) fidEl.value = "";
      const submitBtn = document.getElementById("form-submit");
      if (submitBtn) submitBtn.textContent = "Add Hospital";
      // hide cancel
      formCancelBtn.style.display = "none";
      // reset select placeholder styling
      const fs = document.getElementById("form-district");
      if (fs) fs.classList.add("is-empty");
      // clear message
      if (msg) msg.textContent = "";
    });
  }

  // Helper to POST WFS-T XML
  function postWFST(xml) {
    return fetch("http://localhost:8080/geoserver/hospital_ws/ows", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xml,
    }).then((res) => {
      if (!res.ok) throw new Error("WFS-T failed: " + res.status);
      return res.text();
    });
  }

  // Handle popup actions using Leaflet popupopen event
  map.on("popupopen", function (e) {
    const container = e.popup.getElement();
    if (!container) return;

    const editBtn = container.querySelector(".edit-hospital");
    const delBtn = container.querySelector(".delete-hospital");

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const fid = editBtn.dataset.fid;
        const feature = fidToFeature.get(fid);
        if (!feature) return alert("ไม่พบข้อมูล");

        // populate form for editing
        form.elements["name_th"].value =
          feature.properties.name_th || feature.properties.name || "";
        form.elements["name_en"].value = feature.properties.name_en || "";
        form.elements["district"].value = feature.properties.district || "";
        form.elements["address"].value =
          feature.properties.address || feature.properties.addr || "";
        form.elements["source"].value = feature.properties.source || "";
        // coordinates from GeoJSON [lon, lat]
        if (feature.geometry && feature.geometry.coordinates) {
          form.elements["lat"].value = feature.geometry.coordinates[1];
          form.elements["lon"].value = feature.geometry.coordinates[0];
        }
        document.getElementById("form-mode").value = "update";
        document.getElementById("form-fid").value = fid;
        document.getElementById("form-submit").textContent = "Save changes";
        // show cancel button when editing
        if (formCancelBtn) formCancelBtn.style.display = "inline-block";
        // ensure hospitals layer is visible and close popup
        if (chkHospitals && !chkHospitals.checked) {
          chkHospitals.checked = true;
          toggleHospitals(true);
        }
        map.closePopup();
        // focus form
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        // ensure form select placeholder styling updates
        const formSelectEl = document.getElementById("form-district");
        if (formSelectEl)
          formSelectEl.classList.toggle("is-empty", formSelectEl.value === "");
      });
    }

    if (delBtn) {
      delBtn.addEventListener("click", () => {
        const fid = delBtn.dataset.fid;
        if (!confirm("ลบรายการนี้จริงหรือไม่?")) return;
        // build WFS-T Delete
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<wfs:Transaction service="WFS" version="1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" xmlns:hos="http://hospital_ws">\n  <wfs:Delete typeName="hos:hospitals">\n    <ogc:Filter>\n      <ogc:FeatureId fid="${fid}"/>\n    </ogc:Filter>\n  </wfs:Delete>\n</wfs:Transaction>`;
        postWFST(xml)
          .then(() => {
            msg.textContent = "ลบเรียบร้อย";
            // reload layer
            return loadHospitals();
          })
          .catch((err) => {
            console.error(err);
            alert("ลบไม่สำเร็จ ดู console");
          });
      });
    }
  });

  // Left menu / icon interactions (simplified)
  document.querySelectorAll(".icon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      // toggle active state for visual feedback
      btn.classList.toggle("active");

      if (action === "rain") {
        // toggle hospitals layer for convenience
        if (chkHospitals) {
          const enabled = btn.classList.contains("active");
          chkHospitals.checked = enabled;
          toggleHospitals(enabled);
        }
      }

      // (removed) Cancel handler was here by mistake

      if (action === "storm") {
        // small zoom in
        map.setZoom(Math.min(map.getZoom() + 1, 18));
      }

      if (action === "wind") {
        // show a temporary marker at map center (demo)
        const center = map.getCenter();
        L.circleMarker(center, { radius: 8, color: "#06b6d4" })
          .addTo(map)
          .bindPopup("ตำแหน่งปัจจุบัน (ทดสอบ)")
          .openPopup();
      }

      if (action === "clear") {
        // reset UI and hospitals layer
        document
          .querySelectorAll(".icon-btn")
          .forEach((b) => b.classList.remove("active"));
        if (chkHospitals) {
          chkHospitals.checked = false;
          toggleHospitals(false);
        }
        map.setView([16.8, 100.26], 10);
      }
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name_th = data.get("name_th") || "";
    const name_en = data.get("name_en") || "";
    const district = data.get("district") || "";
    const address = data.get("address") || "";
    const lat = data.get("lat");
    const lon = data.get("lon");
    const source = data.get("source") || "";
    const mode = data.get("mode") || "insert";
    const fid = data.get("fid") || "";

    if (mode === "insert") {
      // WFS-T Insert (note: GML coordinates use lon,lat)
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<wfs:Transaction service="WFS" version="1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:gml="http://www.opengis.net/gml" xmlns:hos="http://hospital_ws">\n  <wfs:Insert>\n    <hos:hospitals>\n      <hos:name_th>${escapeXml(
        name_th
      )}</hos:name_th>\n      <hos:name_en>${escapeXml(
        name_en
      )}</hos:name_en>\n      <hos:district>${escapeXml(
        district
      )}</hos:district>\n      <hos:address>${escapeXml(
        address
      )}</hos:address>\n      <hos:source>${escapeXml(
        source
      )}</hos:source>\n      <hos:geom>\n        <gml:Point srsName="EPSG:4326">\n          <gml:coordinates>${lon},${lat}</gml:coordinates>\n        </gml:Point>\n      </hos:geom>\n    </hos:hospitals>\n  </wfs:Insert>\n</wfs:Transaction>`;

      postWFST(xml)
        .then(() => {
          msg.textContent = "เพิ่มโรงพยาบาลเรียบร้อย 🎉";
          form.reset();
          document.getElementById("form-mode").value = "insert";
          document.getElementById("form-fid").value = "";
          const submitBtn = document.getElementById("form-submit");
          if (submitBtn) submitBtn.textContent = "Add Hospital";
          // hide cancel if visible
          if (formCancelBtn) formCancelBtn.style.display = "none";
          // reset select placeholder styling
          const fs = document.getElementById("form-district");
          if (fs) fs.classList.add("is-empty");
          return loadHospitals();
        })
        .catch((err) => {
          console.error(err);
          msg.textContent = "เกิดข้อผิดพลาด ❌ ดู console";
        });
    } else if (mode === "update") {
      // Build WFS-T Update
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<wfs:Transaction service="WFS" version="1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:hos="http://hospital_ws">\n  <wfs:Update typeName="hos:hospitals">\n    <wfs:Property>\n      <wfs:Name>hos:name_th</wfs:Name>\n      <wfs:Value>${escapeXml(
        name_th
      )}</wfs:Value>\n    </wfs:Property>\n    <wfs:Property>\n      <wfs:Name>hos:name_en</wfs:Name>\n      <wfs:Value>${escapeXml(
        name_en
      )}</wfs:Value>\n    </wfs:Property>\n    <wfs:Property>\n      <wfs:Name>hos:district</wfs:Name>\n      <wfs:Value>${escapeXml(
        district
      )}</wfs:Value>\n    </wfs:Property>\n    <wfs:Property>\n      <wfs:Name>hos:address</wfs:Name>\n      <wfs:Value>${escapeXml(
        address
      )}</wfs:Value>\n    </wfs:Property>\n    <wfs:Property>\n      <wfs:Name>hos:source</wfs:Name>\n      <wfs:Value>${escapeXml(
        source
      )}</wfs:Value>\n    </wfs:Property>\n    <wfs:Property>\n      <wfs:Name>hos:geom</wfs:Name>\n      <wfs:Value>\n        <gml:Point srsName="EPSG:4326">\n          <gml:coordinates>${lon},${lat}</gml:coordinates>\n        </gml:Point>\n      </wfs:Value>\n    </wfs:Property>\n    <ogc:Filter>\n      <ogc:FeatureId fid="${fid}"/>\n    </ogc:Filter>\n  </wfs:Update>\n</wfs:Transaction>`;

      postWFST(xml)
        .then(() => {
          msg.textContent = "แก้ไขเรียบร้อย";
          form.reset();
          document.getElementById("form-mode").value = "insert";
          document.getElementById("form-fid").value = "";
          const submitBtn2 = document.getElementById("form-submit");
          if (submitBtn2) submitBtn2.textContent = "Add Hospital";
          // hide cancel if visible
          if (formCancelBtn) formCancelBtn.style.display = "none";
          // reset select placeholder styling
          const fs2 = document.getElementById("form-district");
          if (fs2) fs2.classList.add("is-empty");
          return loadHospitals();
        })
        .catch((err) => {
          console.error(err);
          msg.textContent = "เกิดข้อผิดพลาด ❌ ดู console";
        });
    } else {
      console.warn("Unknown form mode:", mode);
    }
  });

  // Basic XML escape to avoid breaking XML when inserting user input
  function escapeXml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
});

// End of file
