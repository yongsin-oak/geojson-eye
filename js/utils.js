// Utility Functions - ฟังก์ชันช่วยเหลือทั่วไป
// ไฟล์นี้เก็บฟังก์ชันที่ใช้ร่วมกันทั่วทั้งแอปพลิเคชัน

// Escape XML characters
function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Escape CQL for GeoServer
function escapeCQL(s) {
  if (!s) return "";
  return String(s).replace(/'/g, "''");
}

// แปลง WMO weather code เป็นคำอธิบาย
function getWeatherDesc(code) {
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

// ระดับความเสี่ยงจาก UV Index
function getUVRiskLevel(uv) {
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

// Format date/time in Thai
function formatThaiDateTime(dateString) {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
