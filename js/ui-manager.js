// UI Manager - จัดการ UI elements
// ไฟล์นี้จัดการการแสดงผล loading, active layers, และ UI อื่นๆ

class UIManager {
  constructor() {
    this.activeLayersDisplay = document.getElementById("active-layers-display");
    this.regionContainer = document.getElementById("region-selector-container");

    this.layerStates = {
      hospitals: false,
      students: false,
      provinces: false,
      districts: false,
      weather: false,
      flood: false,
      air: false,
      quakes: false,
    };
  }

  // อัปเดตสถานะ layer
  setLayerState(layerName, isActive) {
    this.layerStates[layerName] = isActive;
    this.updateActiveLayersDisplay();
  }

  // แสดง/ซ่อน region selector
  updateActiveLayersDisplay() {
    const activeLayers = Object.entries(this.layerStates)
      .filter(([_, isActive]) => isActive)
      .map(([name, _]) => {
        const displayNames = {
          hospitals: "โรงพยาบาล",
          students: "นักเรียน",
          provinces: "เส้นแบ่งจังหวัด",
          districts: "เส้นแบ่งอำเภอ",
          weather: "สภาพอากาศ",
          flood: "UV Index",
          air: "คุณภาพอากาศ",
          quakes: "แผ่นดินไหว",
        };
        return displayNames[name];
      });

    if (activeLayers.length === 0) {
      this.activeLayersDisplay.innerHTML =
        '<div class="text-gray-500 italic">ไม่มี layer ที่เปิด</div>';
    } else {
      this.activeLayersDisplay.innerHTML = activeLayers
        .map(
          (name) =>
            `<div class="flex items-center gap-2"><div class="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>${name}</div>`
        )
        .join("");
    }

    // แสดง/ซ่อน Region Selector
    const needsRegion =
      this.layerStates.weather ||
      this.layerStates.flood ||
      this.layerStates.air;

    if (this.regionContainer) {
      if (needsRegion) {
        this.regionContainer.classList.remove("hidden");
      } else {
        this.regionContainer.classList.add("hidden");
      }
    }
  }
}

// สร้าง instance ของ UIManager
const uiManager = new UIManager();
