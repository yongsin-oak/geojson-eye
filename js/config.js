// Configuration และ Constants
// ไฟล์นี้เก็บค่าคงที่และการตั้งค่าต่างๆ ของแอปพลิเคชัน

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Default region - เปลี่ยนเป็นภาคกลาง
const DEFAULT_REGION = "central";

// Map initial view (Thailand center)
const MAP_CENTER = [13.736717, 100.523186];
const MAP_ZOOM = 6;

// WFS endpoints
const HOSPITALS_WFS_URL =
  "http://localhost:8080/geoserver/db_gis/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=db_gis:hospitals&outputFormat=application/json";
const HOSPITALS_WFS_ENDPOINT = "http://localhost:8080/geoserver/db_gis/ows";

const STUDENTS_WFS_URL =
  "http://localhost:8080/geoserver/db_gis/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=db_gis:students&outputFormat=application/json";
const STUDENTS_WFS_ENDPOINT = "http://localhost:8080/geoserver/db_gis/ows";

// District list (Phitsanulok example)
const DISTRICTS = [
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
